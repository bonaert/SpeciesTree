import json
import logging
from google.appengine.api.taskqueue import taskqueue
from google.appengine.ext import ndb
import time
import webapp2
import sys
import os
import populate

from google.appengine.api import memcache
from google.appengine.api import search


def fix_path():
    sys.path.append(os.path.dirname(__file__))


fix_path()

import credentials
from populate import Organism

ranks = ['KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS', 'SPECIES']
INDEX = search.Index(name="organisms")

file_names = {'about.html', 'index.html', 'sitemap.xml', 'google7e0693b4ccda33f7.html'}


def get_file(filename):
    if filename in file_names:
        return get_from_cache(filename)
    else:
        return get_from_cache('index.html')


def get_from_cache(filename):
    cached_value = memcache.get(filename)
    if cached_value is not None:
        return cached_value
    else:
        value = file(filename).read()
        memcache.add(filename, value)
        return value


class PopulateHandler(webapp2.RequestHandler):
    def get(self):
        if self.request.get('admin') == credentials.ADMIN_KEY:
            params = {'admin': credentials.ADMIN_KEY}
            if self.request.get('id'):
                params['id'] = self.request.get('id')

            if self.request.get('rank_id'):
                params['rank_id'] = self.request.get('rank_id')

            taskqueue.add(url='/populate', params=params)
            self.response.write('Added task!')
        else:
            self.response.write('Wrong key!')

    def post(self):
        if self.request.get('admin') != credentials.ADMIN_KEY:
            return

        ID = self.request.get('id')
        rank_id = self.request.get('rank_id')
        if ID != "" and rank_id != "":
            try:
                ID = int(ID)
                rank_id = int(rank_id)
                populator = populate.Populator(self.request.host_url)
                populator.populate_id(ID, rank_id)
                return
            except ValueError:
                pass
        else:
            populator = populate.Populator(self.request.host_url)
            populator.populate()


def delete_data_in_datastore():
    ndb.delete_multi(
        Organism.query().iter(keys_only=True)
    )


def delete_data_in_index(index_name):
    """Delete all the docs in the given index."""
    doc_index = search.Index(name=index_name)

    # looping because get_range by default returns up to 100 documents at a time
    while True:
        # Get a list of documents populating only the doc_id field and extract the ids.
        document_ids = [doc.doc_id for doc in doc_index.get_range(ids_only=True, limit=100)]
        if not document_ids:
            break
        # Delete the documents for the given ids from the Index.
        doc_index.delete(document_ids)


def delete_data():
    delete_data_in_datastore()
    delete_data_in_index('organisms')


class DeleteDataHandler(webapp2.RequestHandler):
    def get(self):
        if self.request.get('admin') == credentials.ADMIN_KEY:
            taskqueue.add(url='/deleteData', params={'admin': credentials.ADMIN_KEY})
            self.response.write('Added task!')
        else:
            self.response.write('Wrong key!')

    def post(self):
        if self.request.get('admin') == credentials.ADMIN_KEY:
            delete_data()


class MainHandler(webapp2.RequestHandler):
    def get(self, filename):
        if filename in file_names:
            if filename == 'sitemap.xml':
                self.response.headers["Content-Type"] = "application/xml"
            self.response.write(get_file(filename))
        else:
            self.response.write(get_file('index.html'))


def organism_to_dict(organism):
    result = {
        'id': organism.ID,
        'scientificName': organism.scientificName,
        'parentID': organism.parentID
    }

    if organism.canonicalName:
        result['canonicalName'] = organism.canonicalName

    if organism.vernacularName:
        result['vernacularName'] = organism.vernacularName

    if organism.authorship:
        result['authorship'] = organism.authorship

    if organism.rank:
        result['rank'] = organism.rank.capitalize()

    return result


def build_json_representation(organisms):
    organism_dict = [organism_to_dict(organism) for organism in organisms if organism]
    return json.dumps(organism_dict)


def get_organism(ID):
    return Organism.query(Organism.ID == ID).get()


def get_data_from_id(ID):
    organism = get_organism(ID)
    return build_json_representation([organism])


def do_search(search_q):
    logging.info(search_q)
    search_query = search.Query(
        query_string=search_q,
        options=search.QueryOptions(
            limit=10))
    search_results = INDEX.search(search_query)
    return search_results


def get_organisms(search_results):
    ids = sorted([int(doc.doc_id) for doc in search_results])
    return [get_organism(ID) for ID in ids]


def get_search_results_for_name(name):
    results = do_search(name)
    if results.number_found != 0:
        return results
    else:
        return None


def get_search_results(name):
    return get_search_results_for_name(name)


def get_data_from_name(name):
    search_results = get_search_results(name)
    if search_results:
        organisms = get_organisms(search_results)
        return build_json_representation(organisms)
    else:
        return '[]'


class GetDataHandler(webapp2.RequestHandler):
    def get(self):
        if self.request.get('id'):
            ID = int(self.request.get('id'))
            result = get_data_from_id(ID)
        elif self.request.get('name'):
            result = get_data_from_name(self.request.get('name'))
        else:
            result = '{"error": "You must pass an id or a name"}'

        self.response.headers["Content-Type"] = "application/json"
        self.response.write(result)


application = webapp2.WSGIApplication([('/deleteData', DeleteDataHandler),
                                       ('/getData', GetDataHandler),
                                       ('/populate', PopulateHandler),
                                       ('/(.*)', MainHandler)
                                      ], debug=True)
