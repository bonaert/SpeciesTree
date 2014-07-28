import webapp2

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.write(file('index.html').read())

class GoogleWebmasterVerifier(webapp2.RequestHandler):
    def get(self):
        self.response.write(file('google7e0693b4ccda33f7.html').read())

class SiteMapHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write(file('sitemap.xml').read())

application = webapp2.WSGIApplication([
    ('/google7e0693b4ccda33f7.html', GoogleWebmasterVerifier),
    ('/sitemap.xml', SiteMapHandler),
    ('/', MainPage)
], debug=True)
