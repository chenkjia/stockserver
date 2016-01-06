var request = require('request');
var cheerio = require('cheerio');
var EventProxy = require('eventproxy');
var mongoose = require('mongoose');
var _ = require('lodash');

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
  code: { type: String, unique: true},
  history: [historySchema]
});

var Stock = mongoose.model('Stock', stockSchema);
batchGetStock(0);
function batchGetStock (n) {
  getStock(n*100+1,[],function(num,list,body) {
    if (num%100==0) {
      Stock.create(list,function (err) {
        console.log(list);
        console.log(list.length);
        if(n<100){
          batchGetStock(n+1);
        }
      });
    }else{
      getStock(num+1,list,body);
    }
  });
}
function pad(num,n) {
  num = num.toString();
  return Array(n>num.length?(n-(''+num).length+1):0).join(0)+num;  
}
function getStock (num,list,callback) {
  var code = pad(num,6);
  get('http://stockpage.10jqka.com.cn/'+code,function(body) {
    console.log(code);
    if(saveStock(body)){
      list.push(saveStock(body));
    }
    callback(num,list,callback);
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
