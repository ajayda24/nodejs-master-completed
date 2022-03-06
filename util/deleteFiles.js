const fs = require('fs');

const deleteFile = (filePath,next) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            const error = new Error(err)
            error.httpStatusCode = 500
            return next(error)
        }
    });
}

exports.deleteFile = deleteFile;