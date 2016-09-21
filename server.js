const Express = require('express')
const Mongo = require('mongodb').MongoClient
const Bing = require('node-bing-api')({ accKey: "mnKS1Nz9Usnm7LyoQhR5EG4tkOLVu4O6XBSijf6hMuA=" })
const app = Express()
const dbName = 'mongodb://localhost:27017/' + 'imagesearch'

// User Story: I can get a list of the most recently submitted search strings.
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  
  Mongo.connect(dbName, (err, db) => {
    if(err) throw err
    
    const collection = db.collection( 'log' )
    
    const searchLog = collection.find().sort({_id:-1}).limit(10).toArray((err, arr)=>{
      if(err) throw err

      res.send(JSON.stringify(arr, null, 2))
    })
    
    db.close()
  })

})

// User Story: I can get the image URLs, alt text and page urls for a set of 
// images relating to a given search string.
// User Story: I can paginate through the responses by adding a ?offset=2 
// parameter to the URL.
app.get('/*', (req, res) => {
  const search = req.params[0].split('?')[0]
  const options = req.query
  const show = 12
  const skip = (options.offset || 0) * show

  // Set up a Bing promise to retrieve image search results
  const bingReady = new Promise( (resolve, reject) => {
    Bing.images(search, {top: show, skip: skip }, (error, res, body) => {
      const searchResults = body.d.results.map( (imageObj) => ({
         imageUrl: imageObj.MediaUrl,
         sourceUrl: imageObj.SourceUrl,
         title: imageObj.Title
       })
      )

      dbSaveSearch(search)
      resolve(searchResults)
    })
  })
  
  // act on that promise
  bingReady.then( result => {
    // Display the results
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(result, null, 2))
  }, err => {
    console.log(err)
  })
  
})


app.listen(8080, () => {
  console.log(`Image search running an listening on port 8080!`)
})


/**
 * Functions
 */
const dbSaveSearch = search => {
  Mongo.connect(dbName, (err, db) => {
    if(err) throw err
    
    const collection = db.collection( 'log' )
    const date = Date.now()
    const obj = {
      query: search,
      timestamp: date
    }
    
    collection.insert(obj)
    
    db.close()
  })
}
