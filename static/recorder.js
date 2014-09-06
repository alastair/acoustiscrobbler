(function(window){

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    this.node = (this.context.createScriptProcessor ||
                 this.context.createJavaScriptNode).call(this.context,
                                                         bufferLen, 2, 2);
    var recording = false,
      currCallback;

    var recLength = 0,
        recBuffersL = [],
        recBuffersR = [];

    this.node.onaudioprocess = function(e){
      if (!recording) return;

      recBuffersL.push(e.inputBuffer.getChannelData(0));
      recBuffersR.push(e.inputBuffer.getChannelData(1));
      recLength += e.inputBuffer.getChannelData(1).length;
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      recLength = 0;
      recBuffersL = [];
      recBuffersR = [];
    }

    this.interleave = function(inputL, inputR){
      var length = inputL.length + inputR.length;
      var result = new Float32Array(length);

      var index = 0,
        inputIndex = 0;

      while (index < length){
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
      }
      return result;
    }

    this.exportWAV = function(cb){
      var bufferL = this.mergeBuffers(recBuffersL, recLength);
      var bufferR = this.mergeBuffers(recBuffersR, recLength);
      var interleaved = this.interleave(bufferL, bufferR);
      var dataview = this.encodeWAV(interleaved, 2, 44100);
      var audioBlob = new Blob([dataview], { type: 'audio/wav' });

      cb(audioBlob);
    }

    this.smallWAV = function(cb, pcmcb){
        var bufferL = this.mergeBuffers(recBuffersL, recLength);
        var bufferR = this.mergeBuffers(recBuffersR, recLength);

        // Target number of samples is current/4 since we are quartering the SR
        var off = new OfflineAudioContext(1, bufferL.length / 4, 11025);
        var b = off.createBuffer(2, bufferL.length, 44100);
        b.getChannelData(0).set(bufferL);
        b.getChannelData(1).set(bufferR);
        var s = off.createBufferSource();
        s.buffer = b
        s.connect(off.destination)
        s.start(0)

        var self = this;
        off.oncomplete = function(e) {
           var channel = e.renderedBuffer.getChannelData(0);
           var dataview = self.encodeWAV(channel, 1, 11025);
           cb(dataview);
           pcmcb(channel);
        };

        off.startRendering();
    }

    this.mergeBuffers = function(recBuffers, recLength){
      var result = new Float32Array(recLength);
      var offset = 0;
      for (var i = 0; i < recBuffers.length; i++){
        result.set(recBuffers[i], offset);
        offset += recBuffers[i].length;
      }
      return result;
    }

    this.floatTo16BitPCM = function(output, offset, input){
      for (var i = 0; i < input.length; i++, offset+=2){
        var s = Math.max(-1, Math.min(1, input[i]));
        var w = s < 0 ? s * 0x8000 : s * 0x7FFF;
        output.setInt16(offset, w, true);
      }
    }

    this.writeString = function(view, offset, string){
      for (var i = 0; i < string.length; i++){
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    this.encodeWAV = function(samples, channels, wavSampleRate){
        // this 2 is size of 1 sample, not num channels (`samples` already has both if it
        // was going to be stereo)
      var buffer = new ArrayBuffer(44 + samples.length * 2);
      var view = new DataView(buffer);

      /* RIFF identifier */
      this.writeString(view, 0, 'RIFF');
      /* file length */
      view.setUint32(4, 32 + samples.length * channels, true);
      /* RIFF type */
      this.writeString(view, 8, 'WAVE');
      /* format chunk identifier */
      this.writeString(view, 12, 'fmt ');
      /* format chunk length */
      view.setUint32(16, 16, true);
      /* sample format (raw) */
      view.setUint16(20, 1, true);
      /* channel count */
      view.setUint16(22, channels, true);
      /* sample rate */
      view.setUint32(24, wavSampleRate, true);
      /* byte rate (sample rate * block align) */
      view.setUint32(28, wavSampleRate * 2 * channels, true);
      /* block align (channel count * bytes per sample) */
      view.setUint16(32, 2 * channels, true);
      /* bits per sample */
      view.setUint16(34, 16, true);
      /* data chunk identifier */
      this.writeString(view, 36, 'data');
      /* data chunk length */
      view.setUint32(40, samples.length * 2, true);

      this.floatTo16BitPCM(view, 44, samples);

      return view;
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);    //this should not be necessary
  };

  window.Recorder = Recorder;

})(window);
