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

filenames = set(['about.html', 'index.html', 'sitemap.xml', 'google7e0693b4ccda33f7.html'])


def get_file(filename):
    if filename in filenames:
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
            taskqueue.add(url='/populate', params={'admin': credentials.ADMIN_KEY})
            self.response.write('Added task!')
        else:
            self.response.write('Wrong key!')

    def post(self):
        if self.request.get('admin') == credentials.ADMIN_KEY:
            time1 = time.time()
            populator = populate.Populator(self.request.host_url)
            populator.populate()
            time2 = time.time()
            logging.info('It took %s s to populate the datastore.' % (time2 - time1))


def deleteData():
    ndb.delete_multi(
        Organism.query().iter(keys_only=True)
    )


def delete_all_in_index(index_name):
    """Delete all the docs in the given index."""
    doc_index = search.Index(name=index_name)

    # looping because get_range by default returns up to 100 documents at a time
    while True:
        # Get a list of documents populating only the doc_id field and extract the ids.
        document_ids = [document.doc_id
                        for document in doc_index.get_range(ids_only=True, limit=100)]
        if not document_ids:
            break
        # Delete the documents for the given ids from the Index.
        doc_index.delete(document_ids)


class DeleteDataHandler(webapp2.RequestHandler):
    def get(self):
        if self.request.get('admin') == credentials.ADMIN_KEY:
            taskqueue.add(url='/deleteData', params={'admin': credentials.ADMIN_KEY})
            self.response.write('Added task!')
        else:
            self.response.write('Wrong key!')

    def post(self):
        if self.request.get('admin') == credentials.ADMIN_KEY:
            time1 = time.time()
            deleteData()
            delete_all_in_index('organisms')
            time2 = time.time()
            logging.info('It took %s s to delete the data.' % (time2 - time1))


class MainHandler(webapp2.RequestHandler):
    def get(self, filename):
        if filename in filenames:
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


def build_json(organisms):
    organism_dict = [organism_to_dict(organism) for organism in organisms if organism]
    return json.dumps(organism_dict)


def get_organism(ID):
    organism = Organism.query(Organism.ID == ID).get()
    logging.info(organism)
    return organism


def get_data_from_id(ID):
    organism = get_organism(ID)
    return build_json([organism])


def do_search(search_q):
    logging.info(search_q)
    sortopts = search.SortOptions(expressions=[
        search.SortExpression(expression='Organism.ID', direction='ASCENDING', default_value=9999999999999999)])
    search_query = search.Query(
        query_string=search_q,
        options=search.QueryOptions(
            sort_options=sortopts,
            limit=10))
    search_results = INDEX.search(search_query)
    return search_results


def get_organisms(search_results):
    organisms = []
    for doc in search_results:
        ID = int(doc.doc_id)
        logging.info(ID)
        organisms.append(get_organism(ID))
    return organisms


def get_search_results_for_name(name):
    # for rank in ranks:
    vernacular_name_query = 'vernacularName = ' + name  # + ' AND rank=' + rank
    results = do_search(vernacular_name_query)

    if results.number_found != 0:
        return results

    general_query = 'canonicalName = %s OR scientificName = %s' % (name, name)
    #general_query = '((canonicalName = %s OR scientificName = %s) AND rank=%s)' % (name, name, rank)
    results = do_search(general_query)

    if results.number_found != 0:
        return results

    return None


def get_search_results(name):
    search_results = get_search_results_for_name(name)

    if not search_results and len(name) > 4:
        search_results = get_search_results_for_name(name[:-1])

    if not search_results and len(name) > 5:
        search_results = get_search_results_for_name(name[:-2])

    return search_results


def get_data_from_name(name):
    search_results = get_search_results(name)
    if search_results:
        logging.info(len(search_results.results))
        logging.info(search_results.results)
        organisms = get_organisms(search_results)
        return build_json(organisms)
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
            result = {}

        self.response.headers["Content-Type"] = "application/json"
        self.response.write(result)


application = webapp2.WSGIApplication([('/deleteData', DeleteDataHandler),
                                       ('/getData', GetDataHandler),
                                       ('/populate', PopulateHandler),
                                       ('/(.*)', MainHandler)
                                      ], debug=True)
