// Generated by CoffeeScript 2.5.1
(function() {
  var SitemapParser, agentOptions, async, headers, request, sax, urlParser, zlib;

  request = require('request');

  sax = require('sax');

  async = require('async');

  zlib = require('zlib');

  urlParser = require('url');

  headers = {
    'user-agent': process.env.USER_AGENT || 'node-sitemap-stream-parser'
  };

  agentOptions = {
    keepAlive: true,
    gzip: true
  };

  request = request.defaults({
    headers,
    agentOptions,
    timeout: 60000
  });

  SitemapParser = class SitemapParser {
    constructor(url_cb1, sitemap_cb1) {
      this.parse = this.parse.bind(this);
      this.url_cb = url_cb1;
      this.sitemap_cb = sitemap_cb1;
      this.visited_sitemaps = {};
    }

    _download(url, parserStream, done) {
      var stream, unzip;
      if (url.lastIndexOf('.gz') === url.length - 3) {
        unzip = zlib.createUnzip();
        return request.get({
          url,
          encoding: null
        }).pipe(unzip).pipe(parserStream);
      } else {
        stream = request.get({
          url,
          gzip: true
        });
        stream.on('error', (err) => {
          return done(err);
        });
        return stream.pipe(parserStream);
      }
    }

    parse(url, done) {
      var inLoc, isSitemapIndex, isURLSet, parserStream;
      isURLSet = false;
      isSitemapIndex = false;
      inLoc = false;
      this.visited_sitemaps[url] = true;
      parserStream = sax.createStream(false, {
        trim: true,
        normalize: true,
        lowercase: true
      });
      parserStream.on('opentag', (node) => {
        inLoc = node.name === 'loc';
        if (node.name === 'urlset') {
          isURLSet = true;
        }
        if (node.name === 'sitemapindex') {
          return isSitemapIndex = true;
        }
      });
      parserStream.on('error', (err) => {
        return done(err);
      });
      parserStream.on('text', (text) => {
        text = urlParser.resolve(url, text);
        if (inLoc) {
          if (isURLSet) {
            return this.url_cb(text, url);
          } else if (isSitemapIndex) {
            if (this.visited_sitemaps[text] != null) {
              return console.error(`Already parsed sitemap: ${text}`);
            } else {
              return this.sitemap_cb(text);
            }
          }
        }
      });
      parserStream.on('end', () => {
        return done(null);
      });
      return this._download(url, parserStream, done);
    }

  };

  exports.parseSitemap = function(url, url_cb, sitemap_cb, done) {
    var parser;
    parser = new SitemapParser(url_cb, sitemap_cb);
    return parser.parse(url, done);
  };

  exports.parseSitemaps = function(urls, url_cb, sitemap_test, done) {
    var parser, queue;
    if (!done) {
      done = sitemap_test;
      sitemap_test = void 0;
    }
    if (!(urls instanceof Array)) {
      urls = [urls];
    }
    parser = new SitemapParser(url_cb, function(sitemap) {
      var should_push;
      should_push = sitemap_test ? sitemap_test(sitemap) : true;
      if (should_push) {
        return queue.push(sitemap);
      }
    });
    queue = async.queue(parser.parse, 4);
    queue.drain = function() {
      return done(null, Object.keys(parser.visited_sitemaps));
    };
    return queue.push(urls);
  };

  exports.parseSitemapsPromise = function(urls, url_cb, sitemap_test) {
    return new Promise(function(resolve) {
      return exports.parseSitemaps(urls, url_cb, sitemap_test, resolve);
    });
  };

  exports.sitemapsInRobots = function(url, cb) {
    return request.get(url, function(err, res, body) {
      var matches;
      if (err) {
        return cb(err);
      }
      if (res.statusCode !== 200) {
        return cb(`statusCode: ${res.statusCode}`);
      }
      matches = [];
      body.replace(/^Sitemap:\s?([^\s]+)$/igm, function(m, p1) {
        return matches.push(p1);
      });
      return cb(null, matches);
    });
  };

}).call(this);
