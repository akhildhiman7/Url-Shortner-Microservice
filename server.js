'use strict';

var express = require('express');
var mongoose = require('mongoose');
const bodyParser = require('body-parser');
var cors = require('cors');
const dns = require('dns');

const {Url} = require('./url.js');
const {Counter} = require('./counter.js');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI, {useMongoClient: true});
//mongoose.connect('mongodb://localhost:27017/UrlShortener');

app.use(cors());
app.use(bodyParser.urlencoded({'extended': false}));
//app.use(bodyParser.json());
app.use('/public', express.static(process.cwd() + '/public'));



app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});


const updateCounter = (count, callback) => {
   Counter.findOneAndUpdate({countOf: 'url'}, {count}).then((c) => {
    console.log('Counter saved');
     callback();
  }).catch((e) => {
    console.log('Error:',e);
  });
}

app.post('/api/shorturl/new', (req, res) => {
  const original_url = req.body.original_url;
  console.log(original_url);

  // check if URL is valid
  dns.lookup(original_url,(err, address) => {
    if(err) res.status(400).send({error: 'invalid URL'});
    
    // check if URL is already stored
    Url.findOne({original_url}).then((doc) => {
      // if already exists
      if(doc) res.status(400).send({error: 'URL already stored at index '+doc.short_url})
        
      // get url count
      Counter.find({countOf: 'url'}).then((docs) => {
        let count = docs[0].count;
        console.log(`Current count ${count}`);
        count++;

        // create new URL
        let newUrl = new Url({
          original_url,
          short_url: count
        });
        console.log(`URL to insert ${newUrl}`);

        // save new URL
        newUrl.save().then((url) => {
          console.log(`URL salvato`);
          // update counter and return url object
          updateCounter(count, () => {            
            res.send({
              original_url: url.original_url,
              short_url: url.short_url
            });
          });
        }).catch((e) => {
          res.status(400).send(e);
        });  // newUrl.save

      }).catch((e) => {
          res.status(400).send(e);
      });  // Counter.find
      
    }).catch((e) => res.status(400).send()) // Url.findOne

  }); // lookup

});

app.get('/api/shorturl/:index', (req, res) => {
  let index = req.params.index;
  console.log('index',index);

  Url.findOne({short_url: index}).then((doc) =>{
    if(!doc) return Promise.reject();
    res.redirect('http://'+doc.original_url);

  }).catch((e) => res.status(400).send({error: 'Short URL not found'}));
});

app.get('/api/urls', (req, res) => {
  Url.find().then((docs) => { 
    res.send({docs});
  }).catch((e) => res.status(400).send(e));
});



app.listen(port, function () {
  console.log('Node.js listening on port ',port);
});