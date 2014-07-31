import json
import os

from google.appengine.ext import ndb
from google.appengine.api import urlfetch
from google.appengine.api import search

import sys
import logging


def fix_path():
    sys.path.append(os.path.dirname(__file__))


fix_path()

import inflect

MAX_LEVEL = 3
VIRUS_ID = 8
ranks = ['LIFE', 'KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS', 'SPECIES']
rank_str_to_rank_id = {rank: ID for (ID, rank) in enumerate(ranks)}
logging.info(rank_str_to_rank_id)

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
        return self._get_children(0, 1)

    def _get_children(self, ID, rank_id, is_virus_subgroup=False):
        data = self.get_data(ID)
        result = self.process_results(ID, data, rank_id, is_virus_subgroup)

        children_results = []
        if rank_id < MAX_LEVEL:
            for child in result:
                child_result = self._get_children(child.ID, rank_id + 1, is_virus_subgroup or child.ID == VIRUS_ID)
                children_results.append(child_result)

        return result + children_results

    def get_data(self, ID):
        if ID == 0:
            return self.get_local_file_data()
        else:
            return self.get_gbif_data(ID)

    def get_gbif_data(self, ID):
        url = self.make_url(ID)

        result = self.fetch(url)
        if result.status_code == 200:
            return json.loads(result.content)['results']
        else:
            return []


    def get_local_file_data(self):
        url = self.make_local_file_url()
        result = self.fetch(url)
        if result.status_code == 200:
            return json.loads(result.content)
        else:
            return []


    def make_url(self, ID):
        return "http://api.gbif.org/v1/species/" + str(ID) + '/children?limit=50'

    def make_local_file_url(self):
        return self.hosturl + '/data/data.json'

    def fetch(self, url):
        return urlfetch.fetch(url)

    def process_results(self, ID, results, rank_id, is_virus_subgroup):
        selected_results = self.select_results(results, rank_id, is_virus_subgroup)
        fixed_results = self.fix_results(selected_results)
        self.add_to_index(fixed_results)
        return [self.process_result(result, ID) for result in fixed_results]

    def select_results(self, results, rank_id, is_virus_subgroup):
        selected_results = []
        for result in results:
            if self.is_good_result(result, rank_id, is_virus_subgroup):
                selected_results.append(result)

        return selected_results

    def is_good_result(self, result, rank_id, is_virus_subgroup):
        result_rank = result['rank']

        if not is_virus_subgroup:
            return result_rank == ranks[rank_id]
        else:
            # Virus have strange classification. Sometimes the children are 2 or 3 ranks lower.
            # If more, we discard them.
            return abs(rank_str_to_rank_id[result_rank] - rank_id) <= 2

    def process_result(self, result, parent_ID):
        organism = self.make_organism(parent_ID, result)
        organism.put()
        return organism

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
        organism = Organism(**values)
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
        logging.info(name)

        try:
            singular = ENGINE.singular_noun(name)
        except TypeError:
            singular = False

        try:
            plural = ENGINE.plural_noun(name)
        except TypeError:
            plural = False

        result = name

        if singular:
            result = result + " " + singular
        if plural:
            result = result + " " + plural

        suffixes = self.make_suffixed(name)
        result = result + " " + suffixes
        logging.info(result)
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

