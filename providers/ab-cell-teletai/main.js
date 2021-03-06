﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.teletie.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'session[login]') 
			return prefs.login;
		else if (name == 'session[password]')
			return prefs.password;

		return value;
	});

	if(!/invisible-captcha/i.test(html)){
		var captchaa;
		AnyBalance.trace('Пытаемся ввести капчу');
		var captchaHref = getParam(html, null, null, /captcha["'][^>]*src=["']\/([^'"]+)/i, replaceTagsAndSpaces);
		
		var captcha = AnyBalance.requestGet(baseurl + captchaHref);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
		
		params.captcha = captchaa;
	}
	
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /error[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*Баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance2', />\s*Расходы по номеру за текущий период(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', />\s*Ваш номер(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', />\s*Статус(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', />\s*Ваш тариф(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	var html = AnyBalance.requestGet(baseurl + 'tariff_description_rests', addHeaders({ Referer: baseurl + 'menu' }));
	var param = getElements(html, /<[^>]+progress-bar-text/ig);
	if (param && param.length == 3) {
		getParam(param[0], result, 'rest_local', null, replaceTagsAndSpaces, parseBalance);
		getParam(param[1], result, 'rest_sms', null, replaceTagsAndSpaces, parseBalance);
		getParam(param[2], result, 'rest_internet', null, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}