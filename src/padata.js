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
  var requrl = 'http://stockpage.10jqka.com.cn/'+code;
  request(requrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var content = acquireData(body);
      getStartYear(code,function(body) {
        getData(code,acquireStock(body),function(body){
          content['history']=acquireHistory(body);
          if (content){
            var stock = new Stock(content);
            stock.save();
          }
        })
      })
    }
  });
}
function getStartYear (code,callback) {
  var requrl = 'http://d.10jqka.com.cn/v2/line/hs_'+code+'/01/last.js';
  request(requrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(body);
    }
  });
}
function acquireStock(data) {
  return data.replace(/^.*(?=\{.*)/,'').substr(2, 4);
}
function getData (code,startYear,callback) {
  for (var i = startYear; i <= 2015; i++) {
    var requrl = 'http://d.10jqka.com.cn/v2/line/hs_'+code+'/01/'+i+'.js';
    var history = request(requrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        callback(body);
      }
    });
  };
}
function acquireData(data) {
    var $ = cheerio.load(data);  //cheerio解析data
    var stock = {};
    stock['label'] = $('h1 a:first-child strong').text().replace(/(^\s*)|(\s*$)/g,'');
    stock['code'] = $('h1 a:first-child').text().replace(/(\s*)/g,'').replace(stock['label'],'');
    if (stock['label']!=''&&stock['code']!=''){
      return stock;
    } else {
      return false;
    }
}
function acquireHistory(data) {
  var data = data.replace(/^(.*(?=\"\:\"))|(\"\:\")|(\"\}\)$)/g,'').split(';');
  var historyData = [];
  for (var i = 0; i < data.length; i++) {
    historyData.push(analysis(data[i]));
  };
  return historyData;
}
function analysis(data) {
  var data = data.split(',');
  var stockitem = {};
  stockitem['date'] = Number(data[0]);
  stockitem['open'] = Number(data[1]);
  stockitem['high'] = Number(data[2]);
  stockitem['low'] = Number(data[3]);
  stockitem['close'] = Number(data[4]);
  stockitem['volume'] = Number(data[5]);
  stockitem['amount'] = Number(data[6]);
  return stockitem
}