"use strict";
/* global Module */

/* Magic Mirror
 * Module: MMM-Wunderlist-Enhanced
 * Adapted By: Dave Richer <davericher@gmail.com>
 * Inspired by MMM-Wunderlist Paul-Vincent Roll http://paulvincentroll.com
 * MIT Licensed.
 */

Module.register("MMM-Wunderlist-Enhanced", {

  defaults: {
    maximumEntries: 10,
    order: "normal",
    lists: ["inbox"],
    interval: 60,
    fade: true,
    fadePoint: 0.25,
    showDeadline: true,
    showAssignee: true
  },

  // Override socket notification handler.
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case 'TASKS':
        this.tasks = payload
        this.updateDom(3000);
        break;
      case 'STARTED':
        this.sendSocketNotification("addLists", this.config.lists);
        if (!this.config.showAssignee)
          break;
        this.started = true;
        this.sendSocketNotification("getUsers");
        break;
      case 'USERS':
        this.users = payload;
        if (this.tasks && this.tasks.length > 0)
          this.updateDom(3000);
        break;
    }
  },

  start: function() {
    this.tasks = [];
    this.sendSocketNotification("CONFIG", this.config);
    this.sendSocketNotification("CONNECTED");
    Log.info("Starting module: " + this.name);
  },

  getTodos: function() {
    var tasks = [];
    this.config.lists.forEach((listValue, listKey) => {
      let list = this.tasks[listValue];
      if (list && list.length)
        list.forEach(todo => {
          if (this.config.order === 'reversed') {
            tasks.push(todo);
          } else {
            tasks.unshift(todo)
          }
        });
      }
    );

    return tasks;
  },

  getScripts: function() {
    return ['String.format.js'];
  },
  getStyles: function() {
    return ['font-awesome.css', 'MMM-Wunderlist-Enhanced.css'];
  },

  html: {
    table: '<tbody>{0}</tbody>',
    titleRow: '<tr><th colspan="4"><header class="module-header"><i class="fa fa-list-ul fa-fw"></i> {0}</header></th></tr>',
    row: '<tr><td>{0}</td><td class="title bright">{1}</td><td>{2}</td><td>{3}</td></tr>',
    star: '<i class="fa fa-star fa-fw" aria-hidden="true"></i>',
    bullet: '<i class="fa fa-chevron-right fa-fw" aria-hidden="true"></i>',
    assignee: '<div class="assignee">{0}</div>'
  },

  getDom: function() {
    if (this.config.showAssignee) {
      this.sendSocketNotification("getUsers");
    }
    var self = this;
    var wrapper = document.createElement("table");
    wrapper.className = "normal small light wunderlist";

    var todos = this.getTodos();

    var rows = [];
    var titleRows = [];

    todos.forEach(function(todo, i) {
      // Generate Title Rows
      if (!titleRows.includes(todo.listFrom))
        titleRows.push(todo.listFrom);

      const titleRowValue = titleRows.findIndex(x => x === todo.listFrom);

      // Generate Rows
      if (!rows[titleRowValue])
        rows[titleRowValue] = [];

      rows[titleRowValue].push(self.html.row.format(todo.starred
        ? self.html.star
        : self.html.bullet, todo.title, self.config.showAssignee && todo.assignee_id && self.users
        ? self.html.assignee.format(self.users[todo.assignee_id])
        : '', self.config.showDeadline && todo.due_date
        ? todo.due_date
        : ''));

      // Create fade effect
      if (self.config.fade && self.config.fadePoint < 1) {
        if (self.config.fadePoint < 0) {
          self.config.fadePoint = 0;
        }
        var startingPoint = todos.length * self.config.fadePoint;
        if (i >= startingPoint) {
          wrapper.style.opacity = 1 - (1 / todos.length - startingPoint * (i - startingPoint));
        }
      }
    });

    const generateRows = () => {
      var results = [];
      titleRows.forEach((key, value) => {
        results.push(self.html.titleRow.format(key));
        let count = 0;
        rows[value].forEach((rowValue, rowKey) => {
          if (count < this.config.maximumEntries)
            results.push(rowValue);
          count = count + 1;
        });
      });
      return results.join('');
    }

    wrapper.innerHTML = this.html.table.format(generateRows())

    return wrapper;
  }
});
