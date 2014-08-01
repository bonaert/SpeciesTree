import json
import logging
import os

from google.appengine.ext import ndb
from google.appengine.api import urlfetch
from google.appengine.api import search

import sys
import constants


def fix_path():
    sys.path.append(os.path.dirname(__file__))


fix_path()

import inflect

MAX_LEVEL = 3
VIRUS_ID = 8
ANIMAL_ID = 1
PLANT_ID = 6

ranks = ['LIFE', 'KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS', 'SPECIES']
rank_str_to_rank_id = {rank: ID for (ID, rank) in enumerate(ranks)}

index = search.Index(name="organisms")

ENGINE = inflect.engine()


class Organism(ndb.Model):
    ID = ndb.IntegerProperty(required=True)
    scientificName = ndb.StringProperty(required=True)
    canonicalName = ndb.StringProperty()
    vernacularName = ndb.StringProperty()
    rank = ndb.StringProperty()
    authorship = ndb.StringProperty()
    parentID = ndb.IntegerProperty(default=0)


class Populator():
    def __init__(self, hosturl):
        self.hosturl = hosturl

    def populate(self):
        self.get_first_three_levels()
        self.get_common_beings()

    def get_first_three_levels(self):
        self._get_children(0, 1, 3)

    def get_common_beings(self):
        logging.info("Started fetching common animals")
        beings = constants.BEINGS

        options = {'is_virus_subgroup': False,
                   'is_animal_or_plant_subgroup': True}
        for being in beings:
            [ID, rank_id] = being
            logging.info(ID)
            self._get_children(ID, rank_id, 1, options)

        logging.info("Stopped fetching common animals")

        #self._get_children(MAMMAL_ID, 4, 4, options=options)
        # self._get_children(BIRD_ID, 4, 4)
        # self._get_children(REPTILE_ID, 4, 4)

    def _get_children(self, ID, rank_id, levels_to_explore=3, options=None):
        if options is None:
            options = {'is_virus_subgroup': False,
                       'is_animal_or_plant_subgroup': False}

        data = self.get_data(ID, rank_id, options)
        result = self.process_results(ID, data, rank_id, options)

        if levels_to_explore > 1:
            for child in result:
                new_options = \
                    {'is_virus_subgroup': options['is_virus_subgroup'] or child.ID == VIRUS_ID,
                     'is_animal_or_plant_subgroup': options['is_animal_or_plant_subgroup'] or child.ID in [ANIMAL_ID,
                                                                                                           PLANT_ID]}

                self._get_children(child.ID, rank_id + 1, levels_to_explore - 1, new_options)


    def get_data(self, ID, rank_id, options):
        if ID == 0:
            return self.get_local_file_data()
        else:
            return self.get_gbif_data(ID, rank_id, options)

    def get_local_file_data(self):
        url = self.make_local_file_url()
        result = self.fetch(url)
        if result.status_code == 200:
            return json.loads(result.content)
        else:
            return []

    def get_gbif_data(self, ID, rank_id, options):
        results = self.get_gfib_data_with_limit(ID)

        if rank_id >= 3 and not options['is_animal_or_plant_subgroup']:
            return results

        # Tries to use different limits, because changing it sometimes
        # returns the vernacular name if missing in the previouus queries
        if self.has_vernacular_name(results):
            logging.info('Children of node with ID %d have vernacular name with no limit' % ID)
            return results

        logging.info('Children of node with ID %d have no vernacular name with no limit' % ID)

        results = self.get_gfib_data_with_limit(ID, 49)

        if self.has_vernacular_name(results):
            logging.info('Children of node with ID %d have vernacular name with limit 49' % ID)
            return results
        else:
            logging.info('Children of node with ID %d have no vernacular name with limit 49' % ID)

        results = self.get_gfib_data_with_limit(ID, 50)

        if self.has_vernacular_name(results):
            logging.info('Children of node with ID %d have vernacular name with limit 50' % ID)
            return results
        else:
            logging.info('Children of node with ID %d have no vernacular name with limit 50' % ID)

        results = self.get_gfib_data_with_limit(ID, 100)
        if self.has_vernacular_name(results):
            logging.info('Children of node with ID %d have vernacular name with limit 100' % ID)
            return results
        else:
            logging.info('Children of node with ID %d have no vernacular name with limit 100' % ID)

        if ID == 44:
            logging.info(results)
        return results


    def get_gfib_data_with_limit(self, ID, limit=None):
        url = self.make_url(ID, limit=limit)

        result = self.fetch(url)
        if result.status_code != 200:
            return []

        return json.loads(result.content)['results']

    def has_vernacular_name(self, results):
        for result in results:
            if 'vernacularName' in result:
                return True
        return False


    def make_url(self, ID, limit=None):
        if limit is None:
            return "http://api.gbif.org/v1/species/" + str(ID) + '/children'  # ?limit=100'
        else:
            return "http://api.gbif.org/v1/species/" + str(ID) + '/children?limit=' + str(limit)

    def make_local_file_url(self):
        return self.hosturl + '/data/data.json'

    def fetch(self, url):
        return urlfetch.fetch(url)

    def process_results(self, ID, results, rank_id, options):
        selected_results = self.select_results(results, rank_id, options)
        fixed_results = self.fix_results(selected_results)

        # Add to search index
        self.add_to_index(fixed_results)

        # Add to NDB datastrore
        organisms = [self.make_organism(ID, result) for result in fixed_results]
        ndb.put_multi(organisms)

        return organisms

    def select_results(self, results, rank_id, options):
        selected_results = []
        for result in results:
            if self.is_good_result(result, rank_id, options):
                selected_results.append(result)

        return selected_results

    def is_good_result(self, result, rank_id, options):
        if result['key'] >= 1000 and not options['is_animal_or_plant_subgroup'] and 'vernacularName' not in result:
            return False

        result_rank = result['rank']

        if not options['is_virus_subgroup']:
            return result_rank == ranks[rank_id]
        else:
            # Virus have strange classification. Sometimes the children are 2 or 3 ranks lower.
            # If more, we discard them.
            return abs(rank_str_to_rank_id[result_rank] - rank_id) <= 2

    def make_organism(self, parent_ID, result):
        values = {
            'ID': result['key'],
            'scientificName': result['scientificName'],
            'parentID': parent_ID
        }
        if 'canonicalName' in result:
            values['canonicalName'] = result['canonicalName']
        if 'vernacularName' in result:
            values['vernacularName'] = result['vernacularName']
        if 'authorship' in result:
            values['authorship'] = result['authorship']
        if 'rank' in result:
            values['rank'] = result['rank']
        organism = Organism(id=str(result['key']), **values)
        return organism

    def add_to_index(self, results):
        documents = [self.make_document(result) for result in results]
        index.put(documents)

    def make_document(self, result):
        fields = self.get_fields(result)
        return search.Document(str(result['key']), fields)

    def get_fields(self, result):
        scientificName = self.build_search_field(result['scientificName'])
        fields = [
            search.TextField(name='scientificName', value=scientificName)
        ]

        if 'canonicalName' in result:
            value = self.build_search_field(result['canonicalName'])
            field = search.TextField(name='canonicalName', value=value)
            fields.append(field)

        if 'vernacularName' in result:
            value = self.build_search_field(result['vernacularName'])
            field = search.TextField(name='vernacularName', value=value)
            fields.append(field)

        if 'rank' in result:
            field = search.TextField(name='rank', value=result['rank'])
            fields.append(field)

        return fields

    def build_search_field(self, name):
        result = name
        try:
            singular = ENGINE.singular_noun(name)
            if singular:
                result = result + " " + singular
        except TypeError:
            pass

        try:
            plural = ENGINE.plural_noun(name)
            if plural:
                result = result + " " + plural
        except TypeError:
            pass

        suffixes = self.make_suffixed(name)
        result = result + " " + suffixes
        return result

    def make_suffixed(self, name):
        if len(name) < 4:
            return ""
        else:
            suffixes = [name[:i] for i in range(4, len(name))]
            return ' '.join(suffixes)

    def fix_results(self, results):
        for result in results:
            if result['authorship']:
                result['scientificName'] = self.get_name_without_authorship(result)

        return results

    def get_name_without_authorship(self, result):
        authorship = result['authorship']
        scientificName = result['scientificName']

        return scientificName.replace(authorship, "")

