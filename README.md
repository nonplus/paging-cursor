# paging-cursor

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Travis](https://img.shields.io/travis/nonplus/paging-cursor.svg)](https://travis-ci.org/nonplus/paging-cursor)
[![Coveralls](https://img.shields.io/coveralls/nonplus/paging-cursor.svg)](https://coveralls.io/github/nonplus/paging-cursor)

Pagination tokens for APIs that use continuation paging.

### Overview

When paging over small amounts of data, an `{ offset, limit }` is often an easy and good-enough solution.

However, offset-based paging usually does not scale well when the (potential) amount of data is large.  It also tends to expose
API internals to the client code that requires paging.

The [“Guys, we’re doing pagination wrong…”](https://hackernoon.com/guys-were-doing-pagination-wrong-f6c18a91b232) article has a great
explanation of issues associated with paging.

The `paging-cursor` library makes it easy to create cursors that imlpement continuation paging.  The goals are:

* Encapsulate cursor information in an opaque, URL-friendly format
* Allow cursors to be comparable (i.e. if `A < B`, then `PagingCursor(A) < PagingCursor(B)`)
* Make it easy to set direction of a cursor

### Installation

```
npm install paging-cusors
```


### Usage

#### Paging data based on a single `id` column

Simple pagination example for data that is sorted (and uniquely identified) by an `id` field.

The cursor keeps track of a text filter (in `context`) and the `id` of the last returned row (in `values`). 

```typescript
import PagingCursor from 'paging-cursor';

function getWidgets(searchText, id) {
  const sql = 'SELECT * FROM widget WHERE name LIKE ? AND id > ? ORDER BY id LIMIT 50';
  return db.query(sql, [`%${searchText}%`, id]);
}

route.get('/widgets', function(req, res) {
  var searchText, id, cursor;
  if (!req.params.pageToken) {
    // Get filter value from query
    searchText = query.params.searchText;
    // Initiales page value
    id = 0;
  } else {  
    // Get filter & page values from cursor
    cursor = PageCursor.parse(req.params.pageToken);
    searchText = cursor.context;
    id = cursor.values[0];
  }
  
  // Fetch data
  getWidgets(searchText, id)
    .then(function(widgets) {
      var lastWidget = widgets[widgets.length-1];
      if (lastWidget) {
        cursor = new PageCursor([lastWidget.id], searchText).toString();
      } else {
        cursor = undefined;
      }

      res.send({
        items: widgets,
        nextPage: cursor
      });
    });
  
});
```



#### Paging data based on multiple columns

Pagination example for data that is sorted on a non-unique `name` field and uniquely identified by an `id` field.

The cursor keeps track of a text filter (in `context`) and the `name` and `id` of the last returned row (in `values`). 

```typescript
import PagingCursor from 'paging-cursor';

function getWidgets(searchText, name, id) {
  const sql = 'SELECT * FROM widget WHERE name LIKE ? AND (name, id) > (?, ?) ORDER BY name, id LIMIT 50';
  return db.query(sql, [`%${searchText}%`, name, id]);
}

route.get('/widgets', function(req, res) {
  var searchText, name, id, cursor;
  if (!req.params.pageToken) {
    // Get filter value from query
    searchText = query.params.searchText;
    // Initiales page value
    name = '';
    id = 0;
  } else {  
    // Get filter & page values from cursor
    cursor = PageCursor.parse(req.params.pageToken);
    searchText = cursor.context;
    name = cursor.values[0];
    id = cursor.values[1];
  }
  
  // Fetch data
  getWidgets(searchText, name, id)
    .then(function(widgets) {
      var lastWidget = widgets[widgets.length-1];
      if (lastWidget) {
        cursor = new PageCursor([lastWidget.name, lastWidget.id], searchText).toString();
      } else {
        cursor = undefined;
      }

      res.send({
        items: widgets,
        nextPage: cursor
      });
    });
  
});
```



#### Paging data based on multiple columns and customer order

Pagination example for data that is sorted by (non-unique) columns (and uniquely identified by an `id` field),
and sorted in a specified sort order ('asc' or 'desc').

The cursor keeps track of a text filter (in `context`), sort order of columns (in `descending`)
and the values of primary and secondary sort columns of the last returned row (in `values`). 

```typescript
import PagingCursor from 'paging-cursor';

function getWidgets(searchText, columns, values, descending) {
  let sql = 'SELECT * FROM widget WHERE name LIKE ? AND (';
  sql += columns.join(', ');
  sql += ') > (';
  sql += columns.map(() => '?').join(', ');
  sql += ') ORDER BY ';
  sql += columns.map((column, index) => column + (descending[index] ? ' DESC' : '')).join(', ');
  sql += '  LIMIT 50';
  return db.query(sql, [`%${searchText}%`].concate(values));
}

const widgetSortColumns = {
  category: ['category', 'name', 'id'],
  name: ['name', 'id'],
  id: ['id']
};

route.get('/widgets', function(req, res) {
  var searchText, sortBy, sortDir, values, columns, descending, cursor;
  if (!req.params.pageToken) {
    // Get filter and orderBy value from query
    searchText = query.params.searchText;    
    sortBy = query.params.sortBy;
    sortDir = query.params.sortDir;
    
    // Set initial page value based on sortBy and sortDir
    switch(sortBy) {
      case 'category':
        if (sortDir === 'desc') {
          values = ['\uffff', '\uffff', Number.MAX_VALUE];
          // category ASC, name DESC, id DESC
          descending = [true];
        } else {
          values = ['', '', 0];
          // category DESC, name ASC, id ASC
          descending = [false, true, true];
        }
        break;
      case 'name':
        if (sortDir === 'desc') {
          values = ['\uffff\uffff', Number.MAX_VALUE];
          descending = [true, true];
        } else {
          values = ['', 0];
        }
        break;
      default:
        sortBy = 'id';
        if (sortDir === 'desc') {
          values = [Number.MAX_VALUE];
          descending = [true];
        } else {
          values = [0];
        }
    }
    
    // Initiales page value
    name = '';
    id = 0;
  } else {  
    // Get filter & page values from cursor
    cursor = PageCursor.parse(req.params.pageToken);
    searchText = cursor.context.searchText;
    values = cursor.values;
    descending = cursor.descending;
  }
  
  const columns = widgetSortColumns[sortBy];
  
  // Fetch data
  getWidgets(searchText, columns, values, descending)
    .then(function(widgets) {
      let nextPage;      
      const lastWidget = widgets[widgets.length-1];
      if (lastWidget) {
        values = columns.map(column => lastWidget[column]);
        nextPage = new PageCursor(values, { searchText: searchText }, values, descending).toString();
      } else {
        nextPage = undefined;
      }
      
      res.send({
        items: widgets,
        nextPage
      });
    });
  
});
```



#### Comparing two cursors

The `PagingCursor.compare(a, b)` method canonically compares two cursors.  Each parameter may be either a `PagingCursor` instance or cursor token.

The method pays attention to the `values` and `descending` properties of the cursors.  It can be used when merging data that is stored in multiple
data partitions.



### NPM scripts

 - `npm test`: Run test suite
 - `npm start`: Run `npm run build` in watch mode
 - `npm run test:watch`: Run test suite in [interactive watch mode](http://facebook.github.io/jest/docs/cli.html#watch)
 - `npm run test:prod`: Run linting and generate coverage
 - `npm run build`: Generate bundles and typings, create docs
 - `npm run lint`: Lints code
 - `npm run commit`: Commit using conventional commit style ([husky](https://github.com/typicode/husky) will tell you to use it if you haven't :wink:)

## Copyright & License

Copyright 2018 Stepan Riha. All Rights Reserved.

This may be redistributed under the MIT licence. For the full license terms, see the LICENSE file which should be alongside this readme.
