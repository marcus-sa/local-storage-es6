import fs from 'fs'
import path from 'path'
import md5 from 'crypto-js/md5'
import CryptoJS from 'crypto-js'
import getFolderSize from 'get-folder-size'
import mkdirp from 'mkdirp'
import moment from 'moment'

export default class LocalStorage {

  cachePath: String
  secretKey: String
  encryptFileName: Boolean = true
  encryptFileContent: Boolean = true

  constructor(args: Object /*path : String, secret : String, encrypt: Boolean = true, mkdir: Boolean = true*/) {
    this.cachePath = args.path
    this.secretKey = args.key
    if (args.encryptFileName === false) {
      this.encryptFileName = false
    }
    if (args.encryptFileContent === false) {
      this.encryptFileContent = false
    }
    if (args.mkdir) {
      fs.stat(args.path, (err) => {
        if(err) mkdirp(args.path, console.log)
      })
    }
  }

  write(key: String, data, callback: Function) {
    const path = this.getPath(key)
    fs.writeFile(path, this.encrypt(data), 'utf8', (err) => {
      if(err) {
        onError(err)
      } else {
        callback(data)
      }
    })
  }

  writeSync(key: String, data) {
    try {
      fs.writeFileSync(this.getPath(key), this.encrypt(data), 'utf8')
    } catch(err) {
      onError(err)
    }
  }

  read(key: String, callback) {
    fs.readFile(this.getPath(key), 'utf8', (err, data) => {
      if (err) {
        onError(err)
      } else {
        callback(this.decrypt(data))
      }
    })
  }

  readSync(key: String) {
    try {
      const data = fs.readFileSync(this.getPath(key), 'utf8')
      return this.decrypt(data)
    } catch(err) {
      onError(err)
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
          let now = moment()
          let fileAge = moment(stat.mtime)

          if (now.diff(fileAge, 'minutes') <= maxAge) {
            resolve()
          } else {
            reject(new Error(`File is x minutes too old`))
          }
        })
        .catch(reject)
    })
  }

  isNotExpiredThenRead(key: String, maxAge: Number) {
    return new Promise((resolve, reject) => {
      this.isNotExpired(key, maxAge)
        .then(() => {
          this.read(key, resolve)
        })
        .catch(reject)
    })
  }

  getPath(key: String): String {
    const cacheKey = this.encryptFileName ? md5(key).toString() : key
    return path.join(this.cachePath, cacheKey)
  }

  purge(key: String, callback: Function) {
    fs.unlink(this.getPath(key), (err) => {
      if (!err) {
        callback()
      } else {
        onError(err)
      }
    })
  }

  purgeSync(key: String) {
    try {
      return fs.unlinkSync(this.getPath(key))
    } catch(err) {
      onError(err)
    }
  }

  trash(callback: Function) {
    fs.readdir(this.cachePath, (err, files) => {
      if (!err) {
        files.forEach(file => fs.unlinkSync(path.join(this.cachePath, file)))
        callback()
      } else {
        onError(err)
      }
    })
  }

  trashSync() {
    fs.readdir(this.cachePath, (err, files) => {
      if (!err) {
        files.forEach(file => fs.unlinkSync(path.join(this.cachePath, file)))
      } else {
        onError(err)
      }
    })
  }

  getSize(callback: Function) {
    getFolderSize(this.cachePath, (err, size) => {
      if (!err) {
        callback((size / 1024 / 1024).toFixed(3))
      } else {
        onError(err)
      }
    })
  }

  encrypt(data) {
    if(typeof data === 'object') {
      data = JSON.stringify(data)
    }

    if (this.encryptFileContent) {
      const encData = CryptoJS.AES.encrypt(data, this.secretKey)

      return encData.toString()
    } else {
      return data
    }
  }

  decrypt(data) {
    if (this.encryptFileContent) {
      const decryptedBytes = CryptoJS.AES.decrypt(data.toString(), this.secretKey)
      const decryptedData = decBytes.toString(CryptoJS.enc.Utf8)

      return this.parse(decryptedData)
    } else {
      return this.parse(data)
    }
  }

  parse(data) {
    return this.isJSON(data) ? JSON.parse(data) : data
  }

  /**
   * @author <https://github.com/chriso/validator.js/blob/master/src/lib/isJSON.js>
   */
  isJSON(data) {
    try {
      const obj = JSON.parse(data)
      return !!obj && typeof obj === 'object'
    } catch (e) { /* ignore */ }
    return false
  }

}

function onError(err) {
  throw new Error(err)
}
