var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/stock');
var Schema = mongoose.Schema;

var historySchema = new Schema({
  date: Number,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  amount: Number
}, {
  _id: false
});
var stockSchema = new Schema({
  label: String,
  code: String,
  history: [historySchema]
});

var Stock = mongoose.model('Stock', stockSchema);

getStock('000001');

function getStock (code) {
  get('http://stockpage.10jqka.com.cn/'+code,function(body) {
    if(saveStock(body)){
      get('http://d.10jqka.com.cn/v2/line/hs_'+code+'/01/last.js',function(body) {
        for (var i = getStartYear(body); i <= 2015; i++) {
          get('http://d.10jqka.com.cn/v2/line/hs_'+code+'/01/'+i+'.js',function(body) {
            Stock.findOneAndUpdate({code:code},{$pushAll:{history:
            saveHistory(body)}},function(err,doc){
              console.log(doc);
            });
          });
        }
      });
    }
  });
}
function get(url,callback){
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(body);
    } else {
      get(url,callback);
    }
  });
}
function saveStock(data) {
    var $ = cheerio.load(data);
    var stock = {};
    stock['label'] = $('h1 a:first-child strong').text().replace(/(^\s*)|(\s*$)/g,'');
    stock['code'] = $('h1 a:first-child').text().replace(/(\s*)/g,'').replace(stock['label'],'');
    if (stock['label']!==''&&stock['code']!==''){
      var stockObject = new Stock(stock);
      stockObject.save();
      return true;
    } else {
      return false;
    }
}
function getStartYear(data) {
  return data.replace(/^.*(?=\{.*)/,'').substr(2, 4);
}
function saveHistory(data) {
  var history = data.replace(/^(.*(?=\"\:\"))|(\"\:\")|(\"\}\)$)/g,'').split(';');
  var historyData = [];
  for (var i = 0; i < history.length; i++) {
    historyData.push(analysisHistory(history[i]));
  }
  return historyData;
}
function analysisHistory(data) {
  var item = data.split(',');
  var stockitem = {};
  stockitem['date'] = Number(item[0]);
  stockitem['open'] = Number(item[1]);
  stockitem['high'] = Number(item[2]);
  stockitem['low'] = Number(item[3]);
  stockitem['close'] = Number(item[4]);
  stockitem['volume'] = Number(item[5]);
  stockitem['amount'] = Number(item[6]);
  return stockitem
}