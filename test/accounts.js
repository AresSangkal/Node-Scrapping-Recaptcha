var cheerio = require('cheerio');
var fs = require('fs');

/* Modify lines below */
let captchaKey = 'f2877700bdeeb14ce95ccf24374ec08e';
var password = 'Password12'; // For the accounts (if you win)
var retryDelay = 10000; // How many miliseconds before retrying if error
let tasksDelayMin = 30000;
let tasksDelayMax = 60000;
var tasks = 500; // Change this to the amount of accounts you would like entered
/* End */

var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36';
var tasksComplete = 0;
let captchaResponse;
let proxy;

// Cookie jar
var jar = require('request').jar();
var request = require('request').defaults({
	jar: jar
});

// Proxies
var proxies;
fs.readFile('files/proxies.txt', 'utf8', function (err, data) {
	proxies = data.split('\n');
	startProcess(); // Start execution
});

function startProcess() {
	if (proxies.length >= 1 && tasksComplete < tasks) {
		let timeout = tasksComplete === 0 ? 0 : Math.floor(Math.random() * (tasksDelayMax - tasksDelayMin)) + tasksDelayMin;

		console.log('\u001b[32m', "[" + tasksComplete + "] - Starting New Task In " + timeout + " MS");
		setTimeout(() => {
			proxy = getRandomProxy();

			jar = require('request').jar();
			request = require('request').defaults({
				jar: jar
			});
			
			startTask(tasksComplete);
		}, timeout);
	}
}

function startTask(taskNum) {
	let url = 'https://www.nakedcph.com/auth/view?op=register';

	request({
		url: url,
		method: 'GET',
		headers: {
			'User-Agent': userAgent,
		},
		proxy: proxy,
		jar: jar
	}, function (error, response, body) {
		if (error) {
			console.log(" [X] Will Retry (" + error.syscall + " " + error.code + ")[" + proxy + "]");
			proxy = getRandomProxy();

			setTimeout(function () {
				startTask(taskNum);
			}, retryDelay)
			return;
		}

		$ = cheerio.load(body);

		if (response.statusCode === 403) {
			let sitekey = $('script[data-type="normal"]').attr('data-sitekey');
			let id = $('script[data-type="normal"]').attr('data-ray');
			let s = $('input[name="s"]').attr('value');

			console.log('\x1b[1;33m', "[" + taskNum + "] - Getting Site Captcha...");

			getCaptcha(sitekey, url, id, s, function() {
				startTask(taskNum);
			});
		}
		
		if (response.statusCode == 200) {
			var csrfToken = $('input[name="_AntiCsrfToken"]').attr('value');

			let sitekey = $('.g-recaptcha').attr('data-sitekey');
			let url2 = 'https://www.nakedcph.com/auth/submit';
			
			request({
				url: `http://2captcha.com/in.php?key=${captchaKey}&method=userrecaptcha&googlekey=${sitekey}&pageurl=${url2}`,
				method: 'POST',
				headers: {
					'User-Agent': userAgent,
				},
			}, function (error, response, body) {
				if (error || body === undefined) {
					startTask(taskNum);
					return;
				}

				let captchaId = body.split('|')[1];
				console.log('\x1b[1;33m', "[" + taskNum + "] - Getting Registration Captcha...");
				solveCaptcha(captchaId, function(captcha) {
					console.log('\x1b[1;33m', "[" + taskNum + "] - Got Registration Page");
					createAccount(taskNum, request, csrfToken, captcha);
				});
			});
		} else if (response.statusCode !== 403) {
			console.log(response.statusCode)
			proxy = getRandomProxy();

			setTimeout(function () {
				startTask(taskNum);
			}, retryDelay)
			return;
		}
	});
}

function getCaptcha(sitekey, url, id, s, callback) {
	request({
		url: `http://2captcha.com/in.php?key=${captchaKey}&method=userrecaptcha&googlekey=${sitekey}&pageurl=${url}`,
		method: 'POST',
		headers: {
			'User-Agent': userAgent
		},
	}, function (error, response, body) {
		console.log('\x1b[1;33m', "[" + tasksComplete + "] - Site Captcha Response: " + body);
		let captchaId = body.split('|')[1];

		solveCaptcha(captchaId, function(body) {
			captchaResponse = body;
			
			let form = {
				s: s,
				id: id
			}

			form['g-recaptcha-response'] = captchaResponse;

			request({
				url: `https://www.nakedcph.com/cdn-cgi/l/chk_captcha`,
				qs: form,
				method: 'GET',
				headers: {
					'User-Agent': userAgent,
      				'Content-Type': 'application/x-www-form-urlencoded'
				},
				proxy: proxy,
				jar: jar
			}, function (error, response, body) {
				if (!error) {
					callback();
				}
			});
		});
	});
}

function solveCaptcha(captchaId, callback) {
	request({
		url: `http://2captcha.com/res.php?key=${captchaKey}&action=get&id=${captchaId}`,
		method: 'GET',
		headers: {
			'User-Agent': userAgent,
		},
	}, function (error, response, body) {
		if (body === 'CAPCHA_NOT_READY') {
			setTimeout(() => {
				solveCaptcha(captchaId, callback);
			}, 5000);
		} else {
			callback(body.split('|')[1]);
		}
	});
}

function createAccount(taskNum, request, csrfToken, captcha) {
	// Domains
	var fileDomainsHistory;
	var domainsHistory;
	var fileCreatedAccounts;
	var createdAccounts;

	// Read domains
	var fileDomains = fs.readFileSync('files/domains.txt', 'utf8');
	
	// Read processed domains
	try {
		fileDomainsHistory = fs.readFileSync('files/domains.history.txt', 'utf8');
	} catch (error) {
		fileDomainsHistory = undefined;
	}

	// If processed domains exist
	if (fileDomainsHistory !== undefined) {
		domainsHistory = fileDomainsHistory.split(',');
		domainsHistory = domainsHistory.filter(function (d) { return d.length > 3});
	} else {
		domainsHistory = [];
	}

	// Read created accounts
	try {
		fileCreatedAccounts = fs.readFileSync('files/created_accounts.txt', 'utf8');
	} catch (error) {
		fileCreatedAccounts = undefined;
	}

	// If processed domains exist
	if (fileCreatedAccounts !== undefined) {
		createdAccounts = fileCreatedAccounts.split(',');
		createdAccounts = createdAccounts.filter(function (d) { return d.length > 3});
	} else {
		createdAccounts = [];
	}

	// List of domains
	var domains = fileDomains.split('\n');

	// Filter domains
	if (domainsHistory !== undefined)
	domains = domains.filter(function (d) { return d.length > 3 && domainsHistory.indexOf(d) === -1});

	// No more domains
	if (domains[0] === undefined) {
		console.log('\u001b[32m', "[" + tasksComplete + "] - No More Emails");
		return;
	}

	var email = domains[0].replace('\r', '');
	var faker = require('faker');
	var firstName = faker.fake("{{name.firstName}}").normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	var lastName = faker.fake("{{name.lastName}}").normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	
	request({
		url: 'https://www.nakedcph.com/auth/submit',
		method: 'POST',
		headers: {
			'x-requested-with': 'XMLHttpRequest',
			'User-Agent': userAgent,
			'x-anticsrftoken': csrfToken,
		},
		proxy: proxy,
		jar: jar,
		formData: {
			'_AntiCsrfToken': csrfToken,
			'firstName': firstName,
			'email': email,
			'password': password,
			'g-recaptcha-response' : captcha,
			'action': 'register'
		},
	}, function (error, response, body) {
		if (error && (response !== undefined && response.statusCode !== 429)) {
			//var proxy2 = getRandomProxy();

			setTimeout(function () {
				createAccount(taskNum, request, csrfToken)
			}, retryDelay)

			return;
		}

		if (response === undefined) return;

		if (response.statusCode == 200) {
			console.log('\x1b[1;33m', "[" + taskNum + "] - Account Created [" + email + "]");

			// Save to processed emails
			domainsHistory.push(email);
			fs.writeFileSync('files/domains.history.txt', domainsHistory.join(','), 'utf8');

			// Save created accounts
			createdAccounts.push(`firstName=${firstName}&lastName=${lastName}&email=${email}`);
			fs.writeFileSync('files/created_accounts.txt', createdAccounts.join(','), 'utf8');
			
			tasksComplete++;
			taskNum = tasksComplete;

			startProcess();

		} else if (response.statusCode !== 429) {
			$ = cheerio.load(body);
			proxy = getRandomProxy();

			console.log('\x1b[1;37m', "[X] - Retrying with new proxy (ERR: " + response.statusCode + ") [" + proxy + "]");
			if (response.statusCode === 500) console.log('\x1b[1;37m', "[X] - " + body);
			if (response.statusCode === 404) console.log($('body').text())

			setTimeout(function () {
				startTask(taskNum, proxy);
			}, retryDelay)

			console.log({
				'_AntiCsrfToken': csrfToken,
				'firstName': firstName,
				'email': email,
				'password': password,
				'g-recaptcha-response' : captcha+'i',
				'action': 'register'
			});

			return;
		}
	});
}

function getRandomProxy() {
	if (proxies[0] != '') {
		var proxy = proxies[Math.floor(Math.random() * proxies.length)].split(':');
		var proxyAuth = proxy[2] + ":" + proxy[3];
		var proxyHost = proxy[0] + ":" + proxy[1];
		if (proxy.length == 2) {
			proxy = "http://" + proxyHost;
			return (proxy);
		} else {
			proxy = "http://" + proxyAuth.trimLeft().trimRight().toString() + "@" + proxyHost;
			return (proxy);
		}
	} else {
		return null;
	}
}