var request = require('request');
var cheerio = require('cheerio');
var EventProxy = require('eventproxy');
var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.connect('mongodb://localhost/stockdemos');
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
  firstYear: Number,
  lastYear: Number,
  history: [historySchema]
});

var Stock = mongoose.model('Stock', stockSchema);
getStockHistorys(5);
function getStockHistorys(n) {
  getStockList(function(docs){
    getStockHistory(n,docs);
  })
}
function getStockHistory(n,docs){
  if(n<docs.length){
    getStock(docs[n].code,docs[n].firstYear,docs[n].lastYear,function() {
      getStockHistory(n+1,docs);
    })
  }
}
function getStockList(callback){
  var stocklist = []
  return Stock.find({history:[]},function(err,docs) {
    callback(docs);
  });
}
function pad(num,n) {
  num = num.toString();
  return Array(n>num.length?(n-(''+num).length+1):0).join(0)+num;  
}

function getStock (code,startYear,lastYear,callback) {
  var ep = new EventProxy();
  ep.after('got_history', lastYear-startYear+1, function (list) {
    var history = _.sortBy(saveHistory(list),'date');
    Stock.findOneAndUpdate({code:code},{$pushAll:{history:history}},function(err,doc){
      console.log(code);
      callback();
    });
  });
  for (var i = startYear; i <= lastYear; i++) {
    get('http://d.10jqka.com.cn/v2/line/hs_'+code+'/01/'+i+'.js',function(body) {
      ep.emit('got_history', body);
    });
  }
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
      return stock;
    } else {
      return false;
    }
}
function getStartYear(data) {
  return data.replace(/^.*(?=\{.*)/,'').substr(2, 4);
}
function getLastYear(data) {
  var tmp = data.substring(0,data.lastIndexOf('},"'));
  return tmp.substring(tmp.lastIndexOf('":')-4,tmp.lastIndexOf('":'));
}
function saveHistory(list) {
  var historyData = [];
  for (var j = 0; j < list.length; j++) {
    var history = list[j].replace(/^(.*(?=\"\:\"))|(\"\:\")|(\"\}\)$)/g,'').split(';');
    for (var i = 0; i < history.length; i++) {
      historyData.push(analysisHistory(history[i]));
    }
  };
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
