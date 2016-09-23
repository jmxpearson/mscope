"use strict"

const HEADER_LENGTH = 1024;

function handleFileSelect(evt) {
    let files = evt.target.files; // FileList object

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

        reader.onloadend = function(evt) {
            let buff = evt.target.result;
            let view = new Uint8Array(buff);
            let str = String.fromCharCode.apply(null, view);
            let header = {};
            eval(str);
            console.log(header);
        }

        reader.readAsArrayBuffer(f.slice(0, HEADER_LENGTH));

        readRecord(f);

    }

}

document.getElementById('files').addEventListener('change', handleFileSelect, false);

function readRecord(theFile, offset=0) {
    // take an OpenEphys .continuous file object and read a record from it starting at given byte offset
    // OpenEphys record:
    // - int64: timestamp: 8 (little)
    // - uint16: number of samples in record: 2 (little)
    // - uint16: recording number: 2 (little)
    // - int16 * 1024: samples: 2048 (big)
    // - uint8 * 10: 10-byte record end code [0, 1, 2, 3, 4, 5, 6, 7, 8, 255]: 10
    // total:
    const RECORD_LENGTH = 2070;

    let reader = new FileReader();
    reader.onloadend = function(evt) {
        let buff = evt.target.result;
        console.log(buff.byteLength)

        let rec = {}
        let view = new DataView(buff, offset, 12);
        rec.tstamp = 'foo';
        rec.nsamples = view.getUint16(8, true);
        rec.recordingNumber = view.getUint16(10, true);
        // warning: typed arrays default to system endianness!!!
        rec.samples = new Int16Array(buff, offset + 12, 1024);
        rec.endcode = new Uint8Array(buff, offset + 12 + 2048, 10);
        console.log(rec);
    }

    reader.readAsArrayBuffer(theFile.slice(HEADER_LENGTH, HEADER_LENGTH + RECORD_LENGTH));

}
