Browser-based Echoprint
-----------------------

Developed at Music Hackday Berlin 2014 by Alastair Porter

Online at http://acoustiscrobbler.com

Development notes
-----------------

Currently works in Firefox only because Chrome cannot resample input
audio below 44100Hz. This can be fixed by using a js resampler rather
than OfflineAudioContext.

The javascript to record audio was adapted from Recorderjs (with
web-workers removed because Firefox can't create OfflineAudioContexts
in a worker yet)

`static/scrobbyl.js` contains interface methods to the emscripten compiled
code, using `Module.ccall`.
The only magic in the `call_pcm` function is to use `_malloc` to allocate
some space on the emscripten heap and copy the data from an Int16Array
into this memory space. Emscripten treats points as the `number` type, so
the arguments to `fingerprint_js_short` are `['number', 'number']`
(pointer to data, length of data).

Due to some unknown memory corruption issues, you cannot run the fingerprinter
more than once without refreshing the page.

`static/recorder.js` contains javascript to record audio using `getUserMedia`.
The `smallWav` method resamples the recorded audio to 1 channel, 11025Hz
and passes the data to a callback which calls into emscripten.
Currently `smallWav` will convert from Float32 to 16 bit PCM before passing it
to echoprint. Echoprint decodes this back to floats. This could be changed
by passing floats directly to echoprint.


Compilation instructions
------------------------

* Install the latest emscripten sdk

* Compile zlib from the emscripten archive

* Checkout echoprint

* Compile for emscripten
