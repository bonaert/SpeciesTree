from collections import Counter
import json
import logging
import os

from google.appengine.ext import ndb
from google.appengine.api import urlfetch
from google.appengine.api import search
from google.appengine.ext import deferred

import sys
from google.appengine.runtime import apiproxy_errors
import constants


def fix_path():
    sys.path.append(os.path.dirname(__file__))


fix_path()

import inflect

MAX_LEVEL = 3
VIRUS_ID = 8
ANIMAL_ID = 1
PLANT_ID = 6

ranks = ['LIFE', 'KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS', 'SPECIES', 'SUBSPECIES']
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


def do_task(host_url, ID, rank_id, levels_to_explore, options):
    populator = Populator(host_url)
    populator.get_recursive_children(ID, rank_id, levels_to_explore, options)


def add_task(host_url, ID, rank_id, levels_to_explore, options=None):
    deferred.defer(do_task, host_url, ID, rank_id, levels_to_explore, options)


class Populator():
    def __init__(self, host_url):
        self.host_url = host_url

    def populate(self):
        self.get_first_three_levels()
        self.get_common_beings()

    def populate_id(self, ID, rank_id):
        options = {'is_virus_subgroup': False,
                   'is_animal_or_plant_subgroup': True}
        self._get_children(ID, rank_id, options)

    def get_first_three_levels(self):
        add_task(self.host_url, 0, 1, 3)

    def get_common_beings(self):
        beings = constants.BEINGS

        options = {'is_virus_subgroup': False,
                   'is_animal_or_plant_subgroup': True}

        for being in beings:
            [ID, rank_id] = being
            add_task(self.host_url, ID, rank_id, 1, options)

    def get_recursive_children(self, ID, rank_id, levels_to_explore=3, options=None):
        options = self.get_options(options)
        result = self._get_children(ID, rank_id, options)

        if levels_to_explore > 1:
            for child in result:
                new_options = \
                    {'is_virus_subgroup': options['is_virus_subgroup'] or child.ID == VIRUS_ID,
                     'is_animal_or_plant_subgroup': options['is_animal_or_plant_subgroup'] or child.ID in [ANIMAL_ID,
                                                                                                           PLANT_ID]}

                add_task(self.host_url, child.ID, rank_id + 1, levels_to_explore - 1, new_options)

    def _get_children(self, ID, rank_id, options=None):
        options = self.get_options(options)
        data = self.get_data(ID, rank_id, options)
        result = self.process_results(ID, data, rank_id, options)
        return result

    def get_options(self, options):
        if options is None:
            return {'is_virus_subgroup': False,
                    'is_animal_or_plant_subgroup': False}
        else:
            return options

    def get_data(self, ID, rank_id, options):
        if ID == 0:
            return self.get_local_file_data()
        else:
            return self.get_gbif_data(ID, rank_id, options)

    def get_local_file_data(self):
        url = self.make_local_file_url()
        result = self.fetch(url)
        if result is not None and result.status_code == 200:
            return json.loads(result.content)
        else:
            return []

    def get_gbif_data(self, ID, rank_id, options):
        do_not_want_to_get_vernacular_name = (rank_id >= 3 and not options['is_animal_or_plant_subgroup'])

        if do_not_want_to_get_vernacular_name:
            return self.get_gfib_data_with_limit(ID)

        results = self.get_gfid_data_using_different_limits(ID)

        if not self.has_vernacular_names(results):
            return self.get_vernacular_names(results)
        else:
            return results

    def get_gfid_data_using_different_limits(self, ID):
        # Tries to use different limits, because changing it sometimes
        # returns the vernacular name if missing in the previouus queries

        results = self.get_gfib_data_with_limit(ID)
        if self.has_vernacular_names(results):
            return results

        results = self.get_gfib_data_with_limit(ID, 49)
        if self.has_vernacular_names(results):
            return results

        results = self.get_gfib_data_with_limit(ID, 50)
        if self.has_vernacular_names(results):
            return results

        results = self.get_gfib_data_with_limit(ID, 100)
        return results

    def get_vernacular_names(self, results):
        for result in results:
            if 'vernacularName' in result:
                continue

            url = self.get_vernacular_name_url(result)
            entries = self.get_all_vernacular_names(url)
            name = self.choose_vernacular_name(entries)

            if name is not None:
                result['vernacularName'] = name

        return results

    def get_vernacular_name_url(self, result):
        return "http://api.gbif.org/v1/species/" + str(result['key']) + '/vernacularNames'

    def get_all_vernacular_names(self, url):
        data = self.fetch(url)
        if data is not None:
            return json.loads(data.content)['results']
        else:
            return []

    def choose_vernacular_name(self, entries):
        english_entries = [entry['vernacularName'] for entry in entries if entry['language'] == "ENGLISH"]
        return self.get_most_common_element(english_entries)

    def get_most_common_element(self, elements):
        if elements:
            return Counter(elements).most_common(1)[0][0]
        else:
            return None

    def get_gfib_data_with_limit(self, ID, limit=None):
        url = self.make_url(ID, limit=limit)

        result = self.fetch(url)
        if result is None or result.status_code != 200:
            return []
        else:
            return json.loads(result.content)['results']

    def has_vernacular_names(self, results):
        for result in results:
            if 'vernacularName' in result:
                return True
        return False

    def make_url(self, ID, limit=None):
        if limit is None:
            return "http://api.gbif.org/v1/species/" + str(ID) + '/children'
        else:
            return "http://api.gbif.org/v1/species/" + str(ID) + '/children?limit=' + str(limit)

    def make_local_file_url(self):
        return self.host_url + '/data/data.json'

    def fetch(self, url):
        try:
            return urlfetch.fetch(url)
        except:
            logging.error("Deadline exceed for: " + url)
            return None

    def process_results(self, ID, results, rank_id, options):
        selected_results = self.select_results(results, rank_id, options)
        fixed_results = self.fix_results(selected_results)

        # Add to search index
        self.add_to_index(fixed_results)

        # Add to NDB datastore
        organisms = [self.make_organism(ID, result) for result in fixed_results]
        self.add_to_ndb(organisms)

        return organisms

    def add_to_ndb(self, organisms):
        try:
            ndb.put_multi(organisms)
        except apiproxy_errors.OverQuotaError as message:
            # Log the error.
            logging.error(message)

    def select_results(self, results, rank_id, options):
        selected_results = []
        for result in results:
            if self.is_good_result(result, rank_id, options):
                selected_results.append(result)

        return selected_results

    def is_good_result(self, result, rank_id, options):
        # We only keep species if they have a vernacular name, except for the first 1000, which are
        # very important and sometimes do not have a common name
        lacks_necessary_vernacular_name = (result['key'] >= 1000 and 'vernacularName' not in result)

        # We keep animal and plants because they have interesting and popular children
        if lacks_necessary_vernacular_name and not options['is_animal_or_plant_subgroup']:
            return False

        result_rank = result['rank']

        if not options['is_virus_subgroup']:
            # Choose only direct children, because GBIF sometimes return children various taxons below
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
        scientific_name = self.build_search_field(result['scientificName'])
        fields = [
            search.TextField(name='scientificName', value=scientific_name)
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

        suffixes = self.make_suffixes(name)
        result = result + " " + suffixes
        return result

    def make_suffixes(self, name):
        if len(name) < 4:
            return ""
        else:
            suffixes = [name[:i] for i in range(4, len(name))]
            return ' '.join(suffixes)

    def fix_results(self, results):
        for result in results:
            if 'authorship' in result and result['authorship']:
                result['scientificName'] = self.get_name_without_authorship(result)

        return results

    def get_name_without_authorship(self, result):
        authorship = result['authorship']
        scientifc_name = result['scientificName']

        return scientifc_name.replace(authorship, "")



