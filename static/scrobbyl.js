function testFloat(dataview) {
        var data = new Float32Array(dataview.buffer);
        var nDataBytes = data.length * data.BYTES_PER_ELEMENT;

        var dataPtr = Module._malloc(nDataBytes);
        var dataHeap = dataPtr;
        for (var i = 0; i < data.length; i++) {
            Module.setValue(dataPtr, data[i], 'float');
            dataPtr += data.BYTES_PER_ELEMENT;
        }

        var result = Module.ccall('fingerprint_js_float', 'string', ['number', 'number'], [dataHeap, data.length]);
        Module._free(dataHeap);
        console.debug(result);

        lookup(result);

}

function call_pcm(data) {
        var nDataBytes = data.length * data.BYTES_PER_ELEMENT;

        var dataPtr = Module._malloc(nDataBytes);
        var dataHeap = dataPtr;
        for (var i = 0; i < data.length; i++) {
            Module.setValue(dataPtr, data[i], 'i16');
            dataPtr += data.BYTES_PER_ELEMENT;
        }

        var result = Module.ccall('fingerprint_js_short', 'string', ['number', 'number'], [dataHeap, data.length]);
        Module._free(dataHeap);
        console.debug(result);

        lookup(result);
}

function testBowie() {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e) {
        var buffer = oReq.response;

        var data = new Int16Array(buffer);
        call_pcm(data);
    }
    oReq.open("GET", "/static/bowie-20-40?x=1", true);
    oReq.responseType = "arraybuffer";
    oReq.send();
}

function lookup(code) {
    $.get("http://developer.echonest.com/api/v4/song/identify",
            {"api_key": "F4LP3UJVBPYSPVKRZ",
             "code": code,
             "version": "4.12"
            },
        function(data) {
            console.debug("Echoprint result");
            console.debug(data);
            var songs = data.response.songs;
            if (songs.length > 0) {
                var s = songs[0];
                $("#artistname").text(s.artist_name);
                $("#songname").text(s.title);
                $("#scbutton").prop('disabled', false);
            } else {
                $("#errors").text("Error getting fingerprint");
            }
        });
}

$(function() {
    $("#scbutton").click(function(e) {
        var artist = $("#artistname").text();
        var track = $("#songname").text();
        if (artist.length && track.length) {
            var url = "/scrobble/" + artist + "/" + track;
            $.get(url, function(e) {
                $("#errors").innerHTML = "Scrobbled!";
            });
        }
    });
    $("#click").click(function(e) {
        startRecording();
    });
});

function pulse(img)
{
    var minOpacity = .33;
    var fadeOutDuration = 1200;
    var fadeInDuration = 1200;

    img.animate({
        opacity: minOpacity
    }, fadeOutDuration, function() {
        img.animate({
            opacity: 1
        }, fadeInDuration, function() {
            if(window.running) {
                pulse(img);
            }
        })
    });
}
