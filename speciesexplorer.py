import webapp2

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.write(file('index.html').read())

class GoogleWebmasterVerifier(webapp2.RequestHandler):
    def get(self):
        self.response.write(file('google7e0693b4ccda33f7.html').read())

application = webapp2.WSGIApplication([
    ('/google7e0693b4ccda33f7.html', GoogleWebmasterVerifier),
    ('/', MainPage)
], debug=True)
