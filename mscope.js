'use strict'
/* global Plotly, FileReader */

// OpenEphys record:
// - int64: timestamp: 8 (little)
// - uint16: number of samples in record: 2 (little)
// - uint16: recording number: 2 (little)
// - int16 * 1024: samples: 2048 (big)
// - uint8 * 10: 10-byte record end code [0, 1, 2, 3, 4, 5, 6, 7, 8, 255]: 10
// total:
const RECORD_LENGTH = 2070
const HEADER_LENGTH = 1024
const ENDIANNESS = isLittleEndian()
let files = []
let headers = []
let numrecs = 10
let dataArray = []
const plotpars = {
  start: 0,  // index of current data buffer at which to start plotting
  stop: 1000,  // index of current data buffer at which to stop plotting
  skip: 1  // stride between successive data to plot
}

// proof of concept to get scroll position
// let plotcontainer = document.getElementById('plotcontainer');
// plotcontainer.onscroll = function(evt) {
//     console.log(evt.target.scrollLeft);
// }

function isLittleEndian () {
    // copied from StackOverflow
  var a = new ArrayBuffer(4)
  var b = new Uint8Array(a)
  var c = new Uint32Array(a)
  b[0] = 0xa1
  b[1] = 0xb2
  b[2] = 0xc3
  b[3] = 0xd4
  if (c[0] === 0xd4c3b2a1) return true
  if (c[0] === 0xa1b2c3d4) return false
  else throw new Error('Something crazy just happened')
}

function handleFileSelect (evt) {
  files = evt.target.files // FileList object
  headers = new Array(files.length)  // clean out headers if we've loaded before
  dataArray = new Array(files.length)
  let plotdata = new Array(files.length)
  for (let i = 0; i < files.length; i++) {
    plotdata[i] = {y: [0], mode: 'lines'}
  }
  let layout = {hovermode: false, showlegend: false}
  let config = {displaylogo: false, displayModeBar: false}

  Plotly.newPlot('plotdiv', plotdata, layout, config)

  for (let i = 0, f = files[i]; i < f.length(); i++) {
    let reader = new FileReader()
    let recReader = new FileReader()

    // read headers
    reader.onloadend = function (evt) {
      let buff = evt.target.result
      let view = new Uint8Array(buff)
      let str = String.fromCharCode.apply(null, view)
      let header = {}
      eval(str)  // eslint-disable-line
      headers[i] = header
      recReader.readAsArrayBuffer(f.slice(HEADER_LENGTH, HEADER_LENGTH + (numrecs + 1) * RECORD_LENGTH))
    }

    reader.readAsArrayBuffer(f.slice(0, HEADER_LENGTH))

      // read records
    recReader.onloadend = function (evt) {
      let buff = evt.target.result
      dataArray[i] = readRecords(buff, headers[i], 0, numrecs)
      updatePlot(i)
    }
  }
}

function updatePlot (idx) {
    // make the plot after loading data
    // idx in the data index to update
  let {start, stop, skip} = plotpars
  let data = new Array(Math.floor((stop - start) / skip))
  for (let t = start, j = 0; t < stop; t += skip, j++) {
    data[j] = dataArray[idx][t] * headers[idx].bitVolts
  }
  let plotdata = {y: data, mode: 'lines'}
  Plotly.deleteTraces('plotdiv', idx)
  Plotly.addTraces('plotdiv', plotdata, idx)
}

document.getElementById('files').addEventListener('change', handleFileSelect, false)

function readRecords (buff, header, startrecord = 0, numrecs = 1) {
  // take an OpenEphys .continuous file buffer object and read a given
  // number of records
  // return typed array of all combined data
  let data = new Int16Array(numrecs * 1024)  // output buffer

  // read each data record,
  for (let r = 0; r < numrecs; r++) {
    let rec = {}
    let offset = (r + startrecord) * RECORD_LENGTH
    let view = new DataView(buff, offset, 12)

    rec.tstamp = 'foo'  // need to fix but no native js int64 support
    rec.nsamples = view.getUint16(8, true)
    rec.recordingNumber = view.getUint16(10, true)
    rec.endcode = new Uint8Array(buff, 0 + 12 + 2048, 10)

    // now read in samples: need to handle endianness
    rec.samples = new Int16Array(1024)  // has endianness of machine
    let source = new DataView(buff, offset + 12, 2048)  // source bytes
    let sink = new DataView(rec.samples.buffer)
    for (let i = 0; i < source.byteLength; i += 2) {
      sink.setInt16(i, header.bitVolts * source.getInt16(i), ENDIANNESS)
    }

    data.set(rec.samples, r * rec.samples.length)
  }

  return data
}
