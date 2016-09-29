"use strict"

// OpenEphys record:
// - int64: timestamp: 8 (little)
// - uint16: number of samples in record: 2 (little)
// - uint16: recording number: 2 (little)
// - int16 * 1024: samples: 2048 (big)
// - uint8 * 10: 10-byte record end code [0, 1, 2, 3, 4, 5, 6, 7, 8, 255]: 10
// total:
const RECORD_LENGTH = 2070;
const HEADER_LENGTH = 1024;
let files = [];
let headers = [];
let numrecs = 10;
let dataArray = [];

function handleFileSelect(evt) {
    files = evt.target.files; // FileList object
    headers = new Array(files.length);  // clean out headers if we've loaded before
    dataArray = new Array(files.length);

    // files is a FileList of File objects. List some properties.
    // let output = [];
    // for (let i = 0, f; f = files[i]; i++) {
    //     output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
    //     f.size, ' bytes, last modified: ',
    //     f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
    //     '</li>');
    // }
    // document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';

    for (let i = 0, f; f = files[i]; i++) {
        let reader = new FileReader();
        let recReader = new FileReader();

        reader.onloadend = function(evt) {
            let buff = evt.target.result;
            let view = new Uint8Array(buff);
            let str = String.fromCharCode.apply(null, view);
            let header = {};
            eval(str);
            headers[i] = header;
        }

        reader.readAsArrayBuffer(f.slice(0, HEADER_LENGTH));

        recReader.onloadend = function(evt) {
            let buff = evt.target.result;
            dataArray[i] = readRecords(buff, 0, 10);
        }

        recReader.readAsArrayBuffer(f.slice(HEADER_LENGTH, HEADER_LENGTH + (numrecs + 1) * RECORD_LENGTH));

    }

}

document.getElementById('files').addEventListener('change', handleFileSelect, false);

function readRecords(buff, startrecord=0, numrecs=1) {
    // take an OpenEphys .continuous file buffer object and read a given
    // number of records
    // return typed array of all combined data
    let data = new Int16Array(numrecs * 1024);  // output buffer

    // read each data record,
    for (let r = 0; r < numrecs; r++) {
        let rec = {};
        let offset = (r + startrecord) * RECORD_LENGTH;
        let view = new DataView(buff, offset, 12);

        rec.tstamp = 'foo';  // need to fix but no native js int64 support
        rec.nsamples = view.getUint16(8, true);
        rec.recordingNumber = view.getUint16(10, true);
        rec.endcode = new Uint8Array(buff, 0 + 12 + 2048, 10);

        // now read in samples: need to handle endianness
        rec.samples = new Int16Array(1024);
        let source = new DataView(buff, offset + 12, 2048);  // source bytes
        let sink = new DataView(rec.samples.buffer);
        for (let i = 0; i < source.byteLength; i += 2) {
            sink.setInt16(i, source.getInt16(i, false));
        }

        data.set(rec.samples, r * rec.samples.length);
    }
    console.log(data)

    return data
}
