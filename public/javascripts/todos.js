let TodosApp;

(() => {
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

	TodosApp = {
		getTemplates() {
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
		},
		getCurrentContext(context) {
			if (context) {
				this.lastContext = context;
			}

			return context || this.lastContext;
		},
		getTodos() {
			return request({url: '/api/todos'}).then(({target: xhr}) => {
				return xhr.response;
			});
		},
		addDueDates(todos) {
			this.todos = todos.map(todo => {
				if (todo.month && todo.year) {
					todo.due_date = `${todo.month}/${todo.year.substring(2)}`;
				} else {
					todo.due_date = 'No Due Date';
				}
				return todo;
			});

			return this.todos;
		},
		sortCollection() {
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
		},
		setDoneTodos() {
			this.done = this.todos.filter(todo => todo.completed);
		},
		groupByDate(todos) {
			return todos.reduce((grouped, todo) => {
				let date = grouped[todo.due_date];
				if (date) {
				  date.push(todo);
		    } else {
		      grouped[todo.due_date] = [todo];
				}

				return grouped;
			}, {});
		},
		setTodosByDate() {
			this.todos_by_date = this.groupByDate(this.todos);
		},
		setDoneTodosByDate() {
			this.done_todos_by_date = this.groupByDate(this.done);
		},
		setSelected({viewSet, dateGroup}) {
			this.selected = viewSet.endsWith('todos_by_date') ? this[viewSet][dateGroup] || [] : this[viewSet];
		},
		setCurrentSection(dateGroup) {
			this.current_section = {data: this.selected.length, title: dateGroup};
		},
		formattedTodos() {
			const incomplete  = this.selected.filter(todo => !todo.completed);
			const complete = this.selected.filter(todo => todo.completed);
			this.selected = incomplete.concat(complete);
		},
		renderPage({context = null, refreshTodos = true}) {
			// Is there ever a case where we dont' want due dates? I guess we'll see
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
			});
		},
		getTodo(id) {
			return request({url: `/api/todos/${this.currentlyEditingId}`}).then(({target: xhr}) => {
				if (xhr.status === 404) {
					alert(xhr.responseText);
					return;
				}

				return xhr.response;
			});
		},
		renderFormFields(todo) {
			for (let property in todo) {
				let formField = document.querySelector(`#form_modal [name$="${property}"]`);
				if (formField && todo[property]) {
					formField.value = todo[property];
				}
			}
		},
		displayModal(updateId) {
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
		},
		removeFromCollection(id) {
			this.todos = this.todos.filter(todo => todo.id !== Number(id));
		},
		getTodoElement(element) {
			return element.closest('tr[data-id]');
		},
		deleteTodo(element) {
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
		},
		editTodo(element) {
			const id = this.getTodoElement(element).dataset.id;
			this.displayModal(id);
		},
		hideModal() {
			if (this.currentlyEditingId) {
				this.currentlyEditingId = null;
			}

			$('#modal_layer, #form_modal').stop().fadeOut(400, () => {
				$('form')[0].reset();
			});
		},
		markTodoComplete(element) {
			let id;
			let data;

			if (element.matches('.list_item')) {
				this.currentlyEditingId = this.getTodoElement(element).dataset.id;
				data = {completed: !(this.todos.find(todo => todo.id === Number(this.currentlyEditingId))).completed};
			} else if (element.matches('button[name="complete"]')) {
				data = {completed: true};
			} else {
				alert('Cannot mark as complete as item has not been created yet!');
				return;
			}

			this.createOrUpdateTodo({
				url: `/api/todos/${this.currentlyEditingId}`,
				method: 'PUT',
				dataCallback(xhr) {
					xhr.setRequestHeader('Content-Type', 'application/json');
					return JSON.stringify(data);
				}
			});
		},
		getDateGroup(element) {
			return element.closest('[data-title]').dataset.title;
		},
		getViewSet(element, dateGroup) {
			const id = element.closest('section[id]').id;
			if (/\d{2}\/\d{2}/.test(dateGroup) || dateGroup === 'No Due Date') {
				return id === 'all' ? 'todos_by_date' : 'done_todos_by_date';
			}
			return id === 'all' ? 'todos' : 'done';
		},
		changeGroupView(element) {
			const dateGroup = this.getDateGroup(element);
			const viewSet = this.getViewSet(element, dateGroup);

			this.renderPage({context: {viewSet, dateGroup}});
		},
		handleClick(event) {
			const element = event.target;

			// give the conditions better names for legibility
			if (element.parentNode.matches('[for="new_item"]')) {
				this.displayModal();
			} else if (element.closest('.delete') !== null) {
				this.deleteTodo(element);
			} else if (element.matches('main label[for^="item"]')) {
				event.preventDefault()
				this.editTodo(element);
			} else if (element.matches('#modal_layer')) {
				this.hideModal();
			} else if (element.matches('.list_item, button[name="complete"]')) {
				event.preventDefault();
				this.markTodoComplete(element);
			} else if (element.closest('[data-title]')) {
				this.changeGroupView(element);
			}
		},
		configureCreateOrUpdateRequest(form) {
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
		},
		editCollection(editedTodo) {
			const todo =  this.todos.find(todo => todo.id === Number(this.currentlyEditingId));
			for (let property in editedTodo) {
				todo[property] = editedTodo[property];
			}
		},
		addToCollection(todo) {
			this.todos.push(todo);
		},
		createOrUpdateTodo(args) {
			request(args).then(({target: xhr}) => {
				if (xhr.status === 400 || xhr.status === 404) {
					alert(xhr.statusText);
					return;
				}

				if (this.currentlyEditingId) {
					this.editCollection(xhr.response);
					this.renderPage({refreshTodos: false});
				} else {
					this.addToCollection(xhr.response);
					this.renderPage({context: {viewSet: 'todos', dateGroup: 'All Todos'}, refreshTodos: false});
				}
			});
		},
		handleSubmit(event) {
			event.preventDefault();

			const form = event.target;
			const requestArgs = this.configureCreateOrUpdateRequest(form);
			this.createOrUpdateTodo(requestArgs);
		},
		bindEvents() {
			document.body.addEventListener('click', this.handleClick.bind(this));
			document.body.addEventListener('submit', this.handleSubmit.bind(this));
		},
		init() {
			this.getTemplates();
			this.renderPage({context: {viewSet: 'todos', dateGroup: 'All Todos'}});
			this.bindEvents();
		}
	};
})();

document.addEventListener('DOMContentLoaded', TodosApp.init.bind(TodosApp));