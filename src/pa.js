var request = require('request');
var cheerio = require('cheerio');
var EventProxy = require('eventproxy');
var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.connect('mongodb://localhost/stockdemo');
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
  code: { type: String, unique: true},
  history: [historySchema]
});

var Stock = mongoose.model('Stock', stockSchema);

var ep = new EventProxy();
batchGetStock(0,0);
function batchGetStock (j,n) {
  var stockRule = [0,2,200,600,601,900];
  var m = stockRule[j]*10+n;
  ep.after('got_stock', 100, function (list) {
    var result = _.sortBy(_.filter(list,function(n){return n}),'code');
    console.log(m);
    Stock.create(result,function (err) {
      if(n%10<9){
        batchGetStock(j,n+1);
      }else{
        if(j<stockRule.length-1){
          batchGetStock(j+1,0);
        }
      }
    });
  });
  for (var i = m*100+1; i <= m*100+100; i++) {
    getStock(i,function (body) {
      ep.emit('got_stock',body);
    });
  }
}

function pad(num,n) {
  num = num.toString();
  return Array(n>num.length?(n-(''+num).length+1):0).join(0)+num;  
}
function getStock (num,callback) {
  var code = pad(num,6);
  get('http://stockpage.10jqka.com.cn/'+code,function(body) {
    callback(saveStock(body));
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
      return stock;
    } else {
      return false;
    }
}
function getStartYear(data) {
  return data.replace(/^.*(?=\{.*)/,'').substr(2, 4);
}
function getLastYear(data) {
  var tmp = data.substring(0,data.indexOf(',"start"'));
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
