import fs from 'fs'
import path from 'path'
import md5 from 'crypto-js/md5'
import CryptoJS from 'crypto-js'
import getFolderSize from 'get-folder-size'
import isJSON from 'validator/lib/isJSON'
import mkdirp from 'mkdirp'

export default class PotatoCache {

  path: String
  secret: String

  constructor(path : String, secret : String, mkdir: Boolean = true) {
    this.cachePath = path
    this.secretKey = secret
    fs.stat(path, (err) => {
      if(err) mkdirp(path, console.log)
    })
  }

  write(key: String, data, callback: Function) {
    var path = this.getPath(key)
    fs.truncate(path, 0, () => {
      var stream = fs.createWriteStream(path, {encoding: 'utf-8'})
      stream.on('open', () => {
        stream.write(this.encrypt(data), (err) => {
          if (err) {
            throw new Error(err)
          } else {
            callback(data)
          }
          stream.end()
        })
      })
      stream.on('error', throw new Error)
    })
  }

  writeSync(key: String, data) {
    try {
      var path = this.getPath(key)
      fs.truncate(path 0, () => {
        var stream = fs.createWriteStream(path, {encoding: 'utf-8'})
        stream.on('open', () => {
          stream.write(this.encrypt(data), (err) => {
            if (err) throw err
            stream.end()
          })
        })
        stream.on('error', throw new Error)
      })
    } catch(err) {
      throw new Error(err)
    }
  }

  read(key: String, callback) {
    var stream = fs.createReadStream(this.getPath(key), {encoding: 'utf-8'})
    stream.once('readable', () => {
      callback(this.decrypt(stream.read()))
    })
    stream.on('error', throw new Error)
  }

  readSync(key: String) {
    try {
      let data = fs.readFileSync(this.getPath(key))
      return this.decrypt(data)
    } catch(err) {
      throw new Error(err)
    }
  }

  exists(key: String) {
    return new Promise((resolve, reject) => {
      fs.stat(this.getPath(key), (err, stat) => {
        if (!err) {
          resolve(stat)
        } else {
          reject(err)
        }
      })
    })
  }

  existsThenRead(key: String) {
    return new Promise((resolve, reject) => {
      this.exists(key)
        .then(() => {
          this.read(key, resolve)
        })
        .catch(reject)
    })
  }

  isNotExpired(key: String, maxAge: Number = 180) {
    return new Promise((resolve, reject) => {
      this.exists(key)
        .then(stat => {
          let now = new Date().getTime()
          let endTime = new Date(stat.mtime).getTime()

          var diff = (now - endTime) / 1000 / 60

          if (maxAge > Math.abs(Math.round(diff))) {
            resolve()
          } else {
            reject(new Error('File is older than ' + maxAge + ' minutes'))
          }
        })
        .catch(reject)
    })
  }

  isNotExpiredThenRead(key: String, maxAge) {
    return new Promise((resolve, reject) => {
      this.isNotExpired()
        .then(() => {
          exports.read(key, resolve)
        })
        .catch(reject)
    })
  }

  getPath(key: String) {
    return path.join(this.cachePath, md5(key) + 'js')
  }

  purge(key: String, callback: Function) {
    fs.unlink(this.getPath(key), (err) => {
      if (!err) {
        callback()
      } else {
        throw new Error(err)
      }
    })
  }

  purgeSync(key: String) {
    try {
      return fs.unlinkSync(this.getPath(key))
    } catch(err) {
      throw new Error(err)
    }
  }

  trash(callback: Function) {
    fs.readdir(this.cachePath, (err, files) => {
      if (!err) {
        files.forEach(file => fs.unlinkSync(path.join(this.cachePath, file)))
        callback()
      } else {
        throw new Error(err)
      }
    })
  }

  trashSync() {
    fs.readdir(this.cachePath, (err, files) => {
      if (!err) {
        files.forEach(file => fs.unlinkSync(path.join(this.cachePath, file)))
      } else {
        throw new Error(err)
      }
    })
  }

  getSize(callback: Function) {
    getFolderSize(this.cachePath, (err, size) => {
      if (!err) {
        callback((size / 1024 / 1024).toFixed(3))
      } else {
        throw new Error(err)
      }
    })
  }

  encrypt(data) {
    if(typeof data === 'object') {
      data = JSON.stringify(data)
    }
    let encData = CryptoJS.AES.encrypt(data, this.secretKey)

    return encData.toString()
  }

  decrypt(data) {
    let decBytes = CryptoJS.AES.decrypt(data.toString(), this.secretKey)
    let decData = decBytes.toString(CryptoJS.enc.Utf8)

    return isJSON(decData) ? JSON.parse(decData) : decData
  }

}
