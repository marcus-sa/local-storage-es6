import LocalStorage from '../lib/storage'

const Storage = new LocalStorage('./storage', '1234', false)

Storage.existsThenRead('chocolate')
  .then(console.log)
  .catch(() => {
    console.log("works")
    Storage.writeSync('chocolate', {brand: 'KitKat', company: 'Nestle'})
  })
