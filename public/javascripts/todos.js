document.addEventListener('DOMContentLoaded', () => {

	// Helper Functions

	function request({method = 'GET', url, dataCallback}) {
		return new Promise((resolve, reject) => {
			let data = null;

			const xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.responseType = 'json';

			if (dataCallback) {
				data = dataCallback(xhr);
			}

			xhr.addEventListener('load', resolve);
			xhr.addEventListener('error', reject);

			xhr.send(data);
		});
	}

	function formDataToObject(formData, stripInvalid) {
    const object = {};
    for (let pair of formData.entries()) {
    	if (stripInvalid && stripInvalid(pair)) {
    		pair[1] = '';
    	}
      object[pair[0]] = pair[1];
    }

    return object;
  }

  // TodosApp Class

	function TodosApp() {
		this.current_section = {};
		this.currentlyEditingId = null;
		this.done = [];
		this.done_todos_by_date = {};
		this.lastContext = null;
		this.selected = [];
		this.templates = {};
		this.todos = [];
		this.todos_by_date = {};
	};

	TodosApp.prototype.getTemplates = function() {
		this.templates = {};

		const handlebarsTemplates = document.querySelectorAll('[type="text/x-handlebars"]');
		for (let i = 0; i < handlebarsTemplates.length; i += 1) {
			let template = handlebarsTemplates[i];
			if (template.dataset.type === 'partial') {
				Handlebars.registerPartial(template.id, template.innerHTML);
			} else {
				this.templates[template.id] = Handlebars.compile(template.innerHTML);
			}
			template.remove();
		}
	};

	TodosApp.prototype.getCurrentContext = function(context) {
		if (context) {
			this.lastContext = context;
		}

		return context || this.lastContext;
	};

	TodosApp.prototype.getTodos = function() {
		return request({url: '/api/todos'}).then(({target: xhr}) => {
			return xhr.response;
		});
	};

	TodosApp.prototype.addDueDates = function(todos) {
		this.todos = todos.map(todo => {
			if (todo.month && todo.year) {
				todo.due_date = `${todo.month}/${todo.year.substring(2)}`;
			} else {
				todo.due_date = 'No Due Date';
			}
			return todo;
		});

		return this.todos;
	};

	TodosApp.prototype.sortCollection = function() {
		this.todos.sort((a, b) => {
			const titleA = a.title.toUpperCase();
			const titleB = b.title.toUpperCase();
		    if (titleA > titleB) {
	        return 1;
		    }
		    if (titleA < titleB) {
	        return -1;
		    }
			return 0;
		});
	};

	TodosApp.prototype.setDoneTodos = function() {
		this.done = this.todos.filter(todo => todo.completed);
	};

	TodosApp.prototype.groupByDate = function(todos) {
		return todos.reduce((grouped, todo) => {
			let date = grouped.find(groupedTodo => groupedTodo[0] === todo.due_date);
			if (date) {
			  date[1].push(todo);
	    } else {
	      grouped.push([todo.due_date, [todo]]);
			}

			return grouped;
		}, []);
	};

	TodosApp.prototype.sortByDate = function(todos) {
		todos.sort(function(a,b) {
		  a = a[0].split('/').reverse().join('');
		  b = b[0].split('/').reverse().join('');
		  return a > b ? 1 : a < b ? -1 : 0;
		});

		if (todos[todos.length - 1][0] === 'No Due Date') {
			const noDueDates = todos.pop();
			todos.unshift(noDueDates);
		}

		return todos;
	};

	TodosApp.prototype.groupAndSortByDate = function(todos) {
		const grouped = this.groupByDate(todos);
		const sorted = this.sortByDate(grouped);

		return Object.fromEntries(sorted);
	};

	TodosApp.prototype.setTodosByDate = function() {
		this.todos_by_date = this.todos.length > 0 ? this.groupAndSortByDate(this.todos) : {};
	};

	TodosApp.prototype.setDoneTodosByDate = function() {
		this.done_todos_by_date = this.done.length > 0 ? this.groupAndSortByDate(this.done) : {};
	};

	TodosApp.prototype.setSelected = function({viewSet, dateGroup}) {
		this.selected = viewSet.endsWith('todos_by_date') ? this[viewSet][dateGroup] || [] : this[viewSet];
	};

	TodosApp.prototype.setCurrentSection = function(dateGroup) {
		this.current_section = {data: this.selected.length, title: dateGroup};
	};

	TodosApp.prototype.formattedTodos = function() {
		const incomplete  = this.selected.filter(todo => !todo.completed);
		const complete = this.selected.filter(todo => todo.completed);
		this.selected = incomplete.concat(complete);
	};

	TodosApp.prototype.setActiveGroup = function(context) {
		const selector = context['viewSet'].startsWith('done') ? '#completed_items' : '#all';
		const element = document.querySelector(`${selector} [data-title="${context['dateGroup']}"]`);
		element.classList.add('active');
	};

	TodosApp.prototype.renderPage = function({context = null, refreshTodos = true}) {
		let todos;
		let currentContext = this.getCurrentContext(context);
		this.currentlyEditingId = null;

		if (refreshTodos) {
			todos = this.getTodos();
		} else {
			todos = Promise.resolve(this.todos);
		}

		todos
		.then(this.addDueDates.bind(this))
		.then(this.sortCollection.bind(this))
		.then(() => {
			this.setDoneTodos();
			this.setTodosByDate();
			this.setDoneTodosByDate();
			this.setSelected(currentContext);
			this.setCurrentSection(currentContext['dateGroup']);
			this.formattedTodos();
			document.body.innerHTML = this.templates.main_template(this);
			this.setActiveGroup(currentContext);
		});
	};

	TodosApp.prototype.getTodo = function(id) {
		return request({url: `/api/todos/${this.currentlyEditingId}`}).then(({target: xhr}) => {
			if (xhr.status === 404) {
				alert(xhr.responseText);
				return;
			}

			return xhr.response;
		});
	};

	TodosApp.prototype.renderFormFields = function(todo) {
		for (let property in todo) {
			let formField = document.querySelector(`#form_modal [name$="${property}"]`);
			if (formField && todo[property]) {
				formField.value = todo[property];
			}
		}
	};

	TodosApp.prototype.displayModal = function(updateId) {
		let preparedModal;

		if (updateId) {
			this.currentlyEditingId = updateId;
			preparedModal = this.getTodo(this.currentlyEditingId)
				.then(this.renderFormFields.bind(this));
		} else {
			preparedModal = Promise.resolve();
		}

		preparedModal.then(() => {
			$('#form_modal').css({top: 200 + window.scrollY});
			$('#modal_layer, #form_modal').stop().fadeIn();
		});
	};

	TodosApp.prototype.removeFromCollection = function(id) {
		this.todos = this.todos.filter(todo => todo.id !== Number(id));
	};

	TodosApp.prototype.getTodoElement = function(element) {
		return element.closest('tr[data-id]');
	};

	TodosApp.prototype.deleteTodo = function(element) {
		const todo = this.getTodoElement(element);
		const id = todo.dataset.id;

		request({url: `/api/todos/${id}`, method: 'DELETE'}).then(({target: xhr}) => {
			if (xhr.status === 404) {
				alert(xhr.responseText);
				return;
			}

			todo.remove();
			this.removeFromCollection(id);
			this.renderPage({refreshTodos: false});
		});
	};

	TodosApp.prototype.editTodo = function(element) {
		const id = this.getTodoElement(element).dataset.id;
		this.displayModal(id);
	};

	TodosApp.prototype.hideModal = function() {
		if (this.currentlyEditingId) {
			this.currentlyEditingId = null;
		}

		$('#modal_layer, #form_modal').stop().fadeOut(400, () => {
			$('form')[0].reset();
		});
	};

	TodosApp.prototype.markTodoComplete = function(element) {
		let id;
		let data;

		if (element.matches('.list_item')) {
			// Marked complete from Main area
			this.currentlyEditingId = this.getTodoElement(element).dataset.id;
			data = {completed: !(this.todos.find(todo => todo.id === Number(this.currentlyEditingId))).completed};
		} else if (element.matches('button[name="complete"]') && !this.currentlyEditingId) {
			// Marked complete in Modal on a new Todo
			alert('Cannot mark as complete as item has not been created yet!');
			return;
		} else {
			// Marked complete in Modal
			data = {completed: true};
		}

		this.createOrUpdateTodo({
			url: `/api/todos/${this.currentlyEditingId}`,
			method: 'PUT',
			dataCallback(xhr) {
				xhr.setRequestHeader('Content-Type', 'application/json');
				return JSON.stringify(data);
			}
		});
	};

	TodosApp.prototype.getDateGroup = function(element) {
		return element.closest('[data-title]').dataset.title;
	};

	TodosApp.prototype.getViewSet = function(element, dateGroup) {
		const id = element.closest('section[id]').id;
		if (/\d{2}\/\d{2}/.test(dateGroup) || dateGroup === 'No Due Date') {
			return id === 'all' ? 'todos_by_date' : 'done_todos_by_date';
		}
		return id === 'all' ? 'todos' : 'done';
	};

	TodosApp.prototype.changeGroupView = function(element) {
		const dateGroup = this.getDateGroup(element);
		const viewSet = this.getViewSet(element, dateGroup);

		this.renderPage({context: {viewSet, dateGroup}});
	};

	TodosApp.prototype.handleClick = function(event) {
		const element = event.target;

		if (element.parentNode.matches('[for="new_item"]')) {
			// User clicked Add Item in Main area
			this.displayModal();
		} else if (element.closest('.delete') !== null) {
			// User clicked a trash icon
			this.deleteTodo(element);
		} else if (element.matches('main label[for^="item"]')) {
			// User clicked a Todo name in the main area
			event.preventDefault()
			this.editTodo(element);
		} else if (element.matches('#modal_layer')) {
			// User clicked the modal layer to close it
			this.hideModal();
		} else if (element.matches('.list_item, button[name="complete"]')) {
			// User completed a Todo
			event.preventDefault();
			this.markTodoComplete(element);
		} else if (element.closest('[data-title]')) {
			// User clicked a date group in the Nav area
			this.changeGroupView(element);
		}
	};

	TodosApp.prototype.configureCreateOrUpdateRequest = function(form) {
		let requestArgs;

		if (this.currentlyEditingId) {
			requestArgs = {url: `/api/todos/${this.currentlyEditingId}`, method: 'PUT'};
		} else {
			requestArgs = {url: '/api/todos', method: 'POST'}
		}

		requestArgs['dataCallback'] = function(xhr) {
			xhr.setRequestHeader('Content-Type', 'application/json');

			const formData = new FormData(form);
			const json = JSON.stringify(formDataToObject(formData, input => {
				if (['due_day', 'due_month', 'due_year'].includes(input[0])) {
					input[0] = input[0].replace('due_', '');
					return !/\d+/.test(input[1]);
				}
				return false;
			}));

			return json;
		}

		return requestArgs;
	};

	TodosApp.prototype.editCollection = function(editedTodo) {
		const todo =  this.todos.find(todo => todo.id === Number(this.currentlyEditingId));
		for (let property in editedTodo) {
			todo[property] = editedTodo[property];
		}
	};

	TodosApp.prototype.addToCollection = function(todo) {
		this.todos.push(todo);
	};

	TodosApp.prototype.createOrUpdateTodo = function(args) {
		request(args).then(({target: xhr}) => {
			if (xhr.status === 400 || xhr.status === 404) {
				alert('You must enter a title at least 3 characters long.');
				return;
			}

			if (this.currentlyEditingId) {
				// Updating a Todo
				this.editCollection(xhr.response);
				this.renderPage({refreshTodos: false});
			} else {
				// Adding a Todo
				this.addToCollection(xhr.response);
				this.renderPage({context: {viewSet: 'todos', dateGroup: 'All Todos'}, refreshTodos: false});
			}
		});
	};

	TodosApp.prototype.handleSubmit = function(event) {
		event.preventDefault();

		const form = event.target;
		const requestArgs = this.configureCreateOrUpdateRequest(form);
		this.createOrUpdateTodo(requestArgs);
	};

	TodosApp.prototype.bindEvents = function() {
		document.body.addEventListener('click', this.handleClick.bind(this));
		document.body.addEventListener('submit', this.handleSubmit.bind(this));
	};

	TodosApp.prototype.init = function() {
		this.getTemplates();
		this.renderPage({context: {viewSet: 'todos', dateGroup: 'All Todos'}});
		this.bindEvents();
	};

	new TodosApp().init();
});
