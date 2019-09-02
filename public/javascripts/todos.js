// input:
// 	- adding a todo
// output:
// 	- todo is created and added to the list if we submit it
// 	- cancelled if we click outside the modal
// description:
// 	problem 1:
// 		- so we have a modal displayed that has a form
// 		- we need a way to associate the modal with an object
// 		- there's nothing on the modal that can associate with a given todo
// 		- maybe we can set a state when displaying the modal and remove it again once it's hidden
// 	problem 2:
// 		- we can listen for submit events on the body object
// 		- when a submit event occurs:
// 			- get a reference to the form using event.target
// 			# FUNCTION (configureCreateOrUpdateRequest)
// 				if this.currentlyEditingId:
// 					requestArgs = {url: `/api/contacts/${this.currentlyEditingId}`, method: 'PUT'};
// 				else:
// 					requestArgs = {url: '/api/contacts', method: 'POST'}

// 				requestArgs['dataCallback'] = function() {
// 					const formData = new FormData(form);
// 					const json = JSON.stringify(formDataToObject(formData));
// 					return json;
// 				}
// 			- call request with requestArgs
// 			- if the xhr.status is 400:
// 				- alert(xhr.statusText);
// 				- return;
// 			- then(({target: xhr}) => {
// 				add the element to the collection
// 				sort the collection
// 				render the page
// 			})
// rules:
// 	- serialize array to JSON:
// 		- define a formDataToObject function:
// 			- declare an empty object
// 			- iterate over the pair of formData.entries()
// 			- assign pair[0] as the key and pair[1] as the value
// 			- return the object
// 		- pass the form into the FormData constructor
// 		- pass the resulting ormData to formDataToObject() and call JSON.stringify on it
// 		- return the json
// Test Cases:
// 	- element is added to the collection, collection is sorted and the DOM is updated to reflect that
// Data Structure:
// 	- new currentlyEditingId state, objects, JSON.stringify, callbacks
// Algorithm:
// 	- on the TodosApp:
// 		- define this.configureCreateOrUpdateRequest(form) method:
// 			if this.updateId:
// 					requestArgs = {url: `/api/contacts/${this.currentlyEditingId}`, method: 'PUT'};
// 				else:
// 					requestArgs = {url: '/api/contacts', method: 'POST'}

// 			requestArgs['dataCallback'] = function() {
// 				const formData = new FormData(form);
// 				const json = JSON.stringify(formDataToObject(formData));
// 				return json;
// 			}

// 			return requestArgs;
// 		- define a this.addToCollection(todo) method:
// 			- this.todos.push(todo);
// 		- define a this.sortCollection() method:
// 			this.todos.sort((a, b) => {
// 				const titleA = a.title.toUpperCase();
// 				const titleB = b.title.toUpperCase();
// 			    if (titleA > titleB) {
// 			        return 1;
// 			    }
// 			    if (titleA < titleB) {
// 			        return -1;
// 			    }
// 				return 0;
// 			})
// 		- define a this.createOrUpdateTodo(requestArgs) method:
// 			- call request(requestArgs).then(({target: xhr}) => {
// 				- if the xhr.status is 400:
// 					- alert(xhr.statusText);
// 					- return;
// 				- call this.addToCollection(xhr.response)
// 				- call this.sortCollection;
// 				- render the page
// 			});
// 		- define a this.handleSubmit({target: form}) method:
// 			- set requestArgs to this.configureCreateOrUpdateRequest()
// 			- call this.createOrUpdateTodo(requestArgs)
// 			- call request(requestArgs).then(({target: xhr}))
// 		- in the this.bindEvents method():
// 			- call document.body.addEventListener('submit', this.handleSubmit.bind(this));

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

	function formDataToObject(formData) {
    var object = {};
    for (var pair of formData.entries()) {
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
				if (template.getAttribute('data-type') === 'partial') {
					Handlebars.registerPartial(template.id, template.innerHTML);
				} else {
					this.templates[template.id] = Handlebars.compile(template.innerHTML);
				}
				template.remove();
			}
		},
		getTodos() {
			return request({url: '/api/todos'}).then(({target: xhr}) => {
				return xhr.response;
			});
		},
		addDueDates(todos) {
			// REVALUATE WHETHER THIS IS NECESSARY AFTER ADDING MORE FUNCTIONALITY
			this.todos = todos.map(todo => {
				if (todo.month && todo.year) {
					todo.due_date = `${month}/${year.substring(1)}`;
				} else {
					todo.due_date = 'No Due Date';
				}
				return todo;
			});

			return this.todos;
		},
		setCurrentSection(content) {
			return content['current_section'] = {data: this.todos.length, title: 'All Todos'};
		},
		renderPage(refreshTodos = true) {
			// Is there ever a case where we dont' want due dates? I guess we'll see
			const content = {};

			if (refreshTodos) {
				this.getTodos()
				.then(this.addDueDates.bind(this))
				.then(() => {
					// duplication
					this.setCurrentSection(content);
					content['selected'] = this.todos;
					document.body.innerHTML = this.templates.main_template(content);
				});
			} else {
				// duplication
				this.setCurrentSection(content);
				content['selected'] = this.todos;
				document.body.innerHTML = this.templates.main_template(content);
			}
		},
		displayModal() {
			$('#form_modal').css({top: 200 + window.scrollY});
			$('#modal_layer, #form_modal').fadeIn();
		},
		removeFromCollection(id) {
			this.todos = this.todos.filter(todo => todo.id !== Number(id));
		},
		deleteTodo(element) {
			const todo = element.closest('tr[data-id]');
			const id = todo.getAttribute('data-id');

			request({url: `/api/todos/${id}`, method: 'DELETE'}).then(({target: xhr}) => {
				if (xhr.status === 404) {
					alert(xhr.responseText);
					return;
				}

				todo.remove();
				this.removeFromCollection(id);
				this.renderPage(false);
			});
		},
		handleClick({target: element}) {
			// give the conditions better names for legibility
			if (element.parentNode.matches('[for="new_item"]')) {
				this.displayModal();
			} else if (element.closest('.delete') !== null) {
				this.deleteTodo(element);
			}
		},
		configureCreateOrUpdateRequest(form) {
			let requestArgs;

			if (this.updateId) {
				requestArgs = {url: `/api/todos/${this.currentlyEditingId}`, method: 'PUT'};
			} else {
				requestArgs = {url: '/api/todos', method: 'POST'}
			}

			requestArgs['dataCallback'] = function(xhr) {
				xhr.setRequestHeader('Content-Type', 'application/json');

				const formData = new FormData(form);
				const json = JSON.stringify(formDataToObject(formData));
				return json;
			}

			return requestArgs;
		},
		addToCollection(todo) {
			this.todos.push(todo);
		},
		createOrUpdateTodo(args) {
			request(args).then(({target: xhr}) => {
				if (xhr.status === 400) {
					alert(xhr.statusText);
					return;
				}

				this.addToCollection(xhr.response);
				// - call this.sortCollection;
				this.renderPage(false);
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
			this.renderPage();
			this.bindEvents();
		}
	};
})();

document.addEventListener('DOMContentLoaded', TodosApp.init.bind(TodosApp));