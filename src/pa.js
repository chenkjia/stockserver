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
  code: { type: String, unique: true},
  firstYear: Number,
  lastYear: Number,
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
  get('http://d.10jqka.com.cn/v2/line/hs_'+code+'/01/last.js',function(body) {
    callback(saveStock(code,body));
  });
}
function get(url,callback){
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(body);
    } else {
      callback(false);
    }
  });
}
function saveStock(code,data) {
  if(data){
    var stock = {};
    var stocktmp =  JSON.parse(data.substring(data.indexOf('({')+1,data.lastIndexOf('})')+1));
    stock['label'] = stocktmp.name;
    stock['code'] = code;
    stock['firstYear'] = _.first(_.keys(stocktmp.year));
    stock['lastYear'] = _.last(_.keys(stocktmp.year));
    return stock;
  } else {
    return false;
  }
}