import json
import logging
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
        if self.request.get('admin') == credentials.POPULATE_KEY:
            populator = populate.Populator(self.request.host_url)
            populator.populate()
            self.response.write('Done!')
        else:
            self.response.write('Wrong key!')


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
        'ID': organism.ID,
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
        result['rank'] = organism.rank

    return result


def build_json(organisms):
    organism_dict = [organism_to_dict(organism) for organism in organisms if organism]
    return json.dumps(organism_dict)

def get_organism(ID):
    organism = Organism.query(Organism.ID == ID).get()
    logging.info(ID)
    logging.info(organism)
    return organism


def get_data_from_id(ID):
    organism = get_organism(ID)
    return build_json([organism])


def get_search_results(search_q):
    logging.info(search_q)
    search_query = search.Query(
        query_string=search_q,
        options=search.QueryOptions(
            limit=10))
    search_results = INDEX.search(search_query)
    return search_results


def get_data_from_name(name):
    search_query = '"%s"' % name.replace('"', '').replace('\\', '')
    search_results = get_search_results(search_query)

    if search_results.number_found == 0 and len(name) > 1:
        search_query = '"%s"' % name[:-1].replace('"', '').replace('\\', '')
        logging.info(search_query)
        search_results = get_search_results(search_query)

    if search_results.number_found == 0 and len(name) > 2:
        search_query = '"%s"' % name[:-2].replace('"', '').replace('\\', '')
        logging.info(search_query)
        search_results = get_search_results(search_query)


    logging.info(len(search_results.results))
    organisms = []
    for doc in search_results:
        logging.info(doc)
        ID = int(doc.doc_id)
        organisms.append(get_organism(ID))

    return build_json(organisms)


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


application = webapp2.WSGIApplication([
                                          ('/getData', GetDataHandler),
                                          ('/populate', PopulateHandler),
                                          ('/(.*)', MainHandler)
                                      ], debug=True)
