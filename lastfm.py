import urllib2
import urllib
import urlparse
import xml.etree.ElementTree
import re
from htmlentitydefs import name2codepoint
import hashlib
import sys
import time
import os

import lfmkey
key=lfmkey.key
secret=lfmkey.secret

def htmlentitydecode(s):
    os= re.sub('&(%s);' % '|'.join(name2codepoint),
            lambda m: unichr(name2codepoint[m.group(1)]), s)
    return os

def _cleanname(x):
	if x is None:
		return ''
	return htmlentitydecode(x)

def _etree_to_dict(etree):
	result={}
	for i in etree:
		if i.tag not in result:
			result[i.tag]=[]
		if len(i):
			result[i.tag].append(_etree_to_dict(i))
		else:
			result[i.tag].append(_cleanname(i.text))
	return result

def _do_raw_lastfm_query(url):
	f = urllib2.Request(url)
	f.add_header('User-Agent','Scrobbyl')
	try:
		f = urllib2.urlopen(f)
	except urllib2.URLError, e:
		raise

	tree = xml.etree.ElementTree.ElementTree(file=f)
	result=_etree_to_dict(tree.getroot())
	return result

def _do_lastfm_post(url, data):
	print data
	f = urllib2.Request(url)
	f.add_header('User-Agent','listen.scrobbyl.com-0.1')
	try:
		f = urllib2.urlopen(f, data)
	except urllib2.URLError, e:
		raise


def _do_lastfm_query(type, method,**kwargs):
	args = {
		"method" : method,
		"api_key" : key,
	 	}
	for k,v in kwargs.items():
		args[k] = v.encode("utf8")
	s = ""
	for k in sorted(args.keys()):
		s+=k+args[k]
	s+=secret

	if "sk" in args.keys() or "token" in args.keys():
		args["api_sig"] = hashlib.md5(s).hexdigest()

	if type == "GET":
		url=urlparse.urlunparse(('http',
			'ws.audioscrobbler.com',
			'/2.0/',
			'',
			urllib.urlencode(args),
			''))
		return _do_raw_lastfm_query(url)
	elif type == "POST":
		url=urlparse.urlunparse(('http',
			'ws.audioscrobbler.com',
			'/2.0/', '', '', ''))
		_do_lastfm_post(url, urllib.urlencode(args))

def _get_auth_token():
	token = _do_lastfm_query("GET", "auth.getToken")
	return token["token"][0]

def _make_session(token):
    try:
        sess = _do_lastfm_query("GET", "auth.getSession", token=token)
        return sess["session"][0]["key"][0]
    except:
        return False

def scrobble(artist, track, session):
	# OK, not the real start time. but that'll do
	ts = "%d" % (time.time() - 100)
	_do_lastfm_query("POST", "track.scrobble", timestamp=ts, artist=artist, track=track, sk=session)

