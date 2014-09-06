#!/usr/bin/python

import os
import sys
import json

import tornado.httpserver
import tornado.ioloop
import tornado.web

import lastfm
import urllib
import urlparse

def get_lfm_url(artist=None, track=None):
    if artist or track:
       cbargs = urllib.urlencode({"artist":artist, "track":track})
    else:
       cbargs = ""
    cburl=urlparse.urlunparse(('http',
        'localhost:8999',
        '/callback',
        '',
        cbargs,
        ''))
    args = {
        "api_key": lastfm.key,
        "cb": cburl
    }
    url=urlparse.urlunparse(('http',
        'www.last.fm',
        '/api/auth/',
        '',
        urllib.urlencode(args),
        ''))
    return url

class LastfmHandler(tornado.web.RequestHandler):
    def get(self):
        token = self.get_argument("token")
        artist = self.get_argument("artist", None)
        track = self.get_argument("track", None)
        sess = lastfm._make_session(token)
        if not sess:
            print "Error making session"
            self.redirect("/?lfmerr")
        else:
            self.set_secure_cookie("lastfm_session", sess)
            print "got a session id", sess
            if artist and track:
                self.redirect(urllib.quote("/scrobble/%s/%s" % (artist, track)))
            else:
                self.redirect("/")

class ScrobbleHandler(tornado.web.RequestHandler):

    def get(self, artist, track):
        sess = self.get_secure_cookie("lastfm_session")
        if sess:
            print "got sess"
            print artist
            print track
            try:
                lastfm.scrobble(artist, track, sess)
                self.redirect("/")
            except:
                # There was an error scrobbling, we need to
                #   delete the session cookie and start again
                #   Also uncheck the auto button - make them do it manually
                # This might happen more often than we like - auth on 2 different
                #  machines. Need login in this case!
                self.redirect("/?lfmerr")
        else:
            print "not got sess"
            self.redirect(self.get_lfm_url(artist, track))


class RootHandler(tornado.web.RequestHandler):
    def get(self):
        login = get_lfm_url()
        return self.render("index.html", loginurl=login)

settings = {"static_path": os.path.join(os.path.dirname(__file__), "static"),
        "cookie_secret": "thisisascrobbler",
        "debug": True}
application = tornado.web.Application([(r"/", RootHandler),
    (r"/callback", LastfmHandler),
    (r"/scrobble/(.*)/(.*)", ScrobbleHandler),
    ], **settings)

def main():
    server = tornado.httpserver.HTTPServer(application)
    server.listen(8999)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()
