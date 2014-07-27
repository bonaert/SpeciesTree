import webapp2

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.write(file('index.html').read())

application = webapp2.WSGIApplication([
    ('/', MainPage),
], debug=True)
