import webapp2
from google.appengine.api import memcache

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

class MainHandler(webapp2.RequestHandler):
    def get(self, filename):
        if filename in filenames:
            if filename == 'sitemap.xml':
                self.response.headers["Content-Type"] = "application/xml"

            self.response.write(get_file(filename))
        else:
            self.response.write(get_file('index.html'))

application = webapp2.WSGIApplication([
    ('/(.*)', MainHandler),
], debug=True)
