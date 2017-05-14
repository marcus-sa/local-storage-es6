import LocalStorage from '../src/storage'

const Storage = new LocalStorage('./storage', '1234', false)

Storage.isNotExpiredThenRead('chocolate', 1) // 1 minute
  .then(console.log)
  .catch(() => {
    console.log("works")
    Storage.writeSync('chocolate', {brand: 'KitKat', company: 'Nestle'})
  })
