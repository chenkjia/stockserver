var request = require('request');
var cheerio = require('cheerio');
var EventProxy = require('eventproxy');
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

getStock(3);

function pad(num, n) {
  num = num.toString();
  return Array(n > num.length ? n - ('' + num).length + 1 : 0).join(0) + num;
}

function getStock(num) {
  var code = pad(num, 6);
  num++;
  console.log(code);
  get('http://stockpage.10jqka.com.cn/' + code, function (body) {
    var stock = saveStock(body);
    if (stock) {
      get('http://d.10jqka.com.cn/v2/line/hs_' + code + '/01/last.js', function (body) {
        var ep = new EventProxy();
        var startYear = Number(getStartYear(body));
        var lastYear = Number(getLastYear(body));
        ep.after('got_history', lastYear - startYear + 1, function (list) {
          stock['history'] = saveHistory(list);
          var stockObject = new Stock(stock);
          stockObject.save(function (err) {
            console.log(num);
            getStock(num);
          });
        });
        for (var i = startYear; i <= lastYear; i++) {
          get('http://d.10jqka.com.cn/v2/line/hs_' + code + '/01/' + i + '.js', function (body) {
            ep.emit('got_history', body);
          });
        }
      });
    } else {
      console.log(true);
      getStock(num);
    }
  });
}
function get(url, callback) {
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(body);
    } else {
      get(url, callback);
    }
  });
}
function saveStock(data) {
  var $ = cheerio.load(data);
  var stock = {};
  stock['label'] = $('h1 a:first-child strong').text().replace(/(^\s*)|(\s*$)/g, '');
  stock['code'] = $('h1 a:first-child').text().replace(/(\s*)/g, '').replace(stock['label'], '');
  if (stock['label'] !== '' && stock['code'] !== '') {
    return stock;
  } else {
    return false;
  }
}
function getStartYear(data) {
  return data.replace(/^.*(?=\{.*)/, '').substr(2, 4);
}
function getLastYear(data) {
  var tmp = data.substring(0, data.indexOf(',"start"'));
  return tmp.substring(tmp.lastIndexOf('":') - 4, tmp.lastIndexOf('":'));
}
function saveHistory(list) {
  var historyData = [];
  for (var j = 0; j < list.length; j++) {
    var history = list[j].replace(/^(.*(?=\"\:\"))|(\"\:\")|(\"\}\)$)/g, '').split(';');
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
  return stockitem;
}