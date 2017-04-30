import LocalStorage from '../'

const Storage = new LocalStorage('./storage', '1234', false)

Storage.existsThenRead('chocolate')
  .then(console.log)
  .catch(() => {
    Storage.writeSync('chocolate', {brand: 'KitKat', company: 'Nestle'})
  })
