var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/stock');
var stockSchema = mongoose.Schema({
  label: String,
  code: String
});
var Stock = mongoose.model('Stock', stockSchema);
function pad(num, n) {
  num = num.toString();
  return Array(n > num.length ? n - ('' + num).length + 1 : 0).join(0) + num;
}
for (var i = 1; i < 99; i++) {
  getStock(pad(i, 6));
};
var num = 0;
function getStock(code) {
  var requrl = 'http://stockpage.10jqka.com.cn/' + code;
  request(requrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var content = acquireData(body);
      num++;
      if (content) {
        var stock = new Stock(content);
        stock.save(function (err) {
          if (err) {
            console.log(err);
          }
          console.log(content);
        });
        console.log(num);
      } else {
        console.log(code);
        console.log(num);
        return false;
      }
    } else {
      getStock(code);
    }
  });
}
function acquireData(data) {
  var $ = cheerio.load(data); //cheerio解析data
  var stock = {};
  stock['label'] = $('h1 a:first-child strong').text().replace(/(^\s*)|(\s*$)/g, '');
  stock['code'] = $('h1 a:first-child').text().replace(/(\s*)/g, '').replace(stock['label'], '');
  if (stock['label'] != '' && stock['code'] != '') {
    return stock;
  } else {
    return false;
  }
}