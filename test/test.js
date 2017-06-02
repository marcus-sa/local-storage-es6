import LocalStorage from '../src/storage'

const Storage = new LocalStorage({
  path: './storage',
  key: '1234',
  mkdir: true,
  encryptFileName: true,
  encryptFileContent: false
})

Storage.existsThenRead('chocolate') // 1 minute
  .then(console.log)
  .catch(() => {
    Storage.writeSync('chocolate', {brand: 'KitKat', company: 'Nestle'})
  })
