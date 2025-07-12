let currentDomain = window.location.hostname;
let currentUrl = "";
let userItemList = [];
let downloadDataNums = 0;
const head = document.head;


/**
 * 初始化弹层
 */
function initToolButton() {
	const html = '<div class="gpt-sr-container">\n' +
		'    <div class="gpt-sr-sidebar">\n' +
		'      <button id="dylive-sr-toggleButton">下载媒体</button>\n' +
		'    </div>\n' +
		'  </div>';
	const popupElement = document.createElement("div");
	popupElement.innerHTML = html;
	document.body.appendChild(popupElement);
	document.querySelector("#dylive-sr-toggleButton").addEventListener("click", function() {
		this.disabled = true;
		chrome.runtime.sendMessage({"type":"check_mkey"}, function (response) {
			console.log(response.farewell)
		});
	});
}



function activiteToolButton()
{
	document.querySelector("#dylive-sr-toggleButton").disabled = false;
}

/**
 * 初始化提示窗
 */
function initPromptMessagePopup()
{
	let html = "<div id=\"nmx_jimeng_popup\" class=\"custom-popup\">\n" +
		"\t\t<div class=\"custom-popup-overlay\"></div>\n" +
		"\t\t<div class=\"custom-popup-content\">\n" +
		"\t\t\t<span id=\"nmx_jimeng_popup_message\" class=\"custom-popup-question\"></span>\n" +
		"\t\t\t<button id=\"nmx_jimeng_close_popupbtn\" class=\"custom-popup-close-btn\">确认</button>\n" +
		"\t\t</div>\n" +
		"\t</div>";
	const popupElement = document.createElement("div");
	popupElement.innerHTML = html;
	document.body.appendChild(popupElement);
	// 获取弹窗元素
	const popup = document.getElementById('nmx_jimeng_popup');
	// 获取关闭按钮元素
	const closeButton = document.getElementById('nmx_jimeng_close_popupbtn');
	// 点击关闭按钮关闭弹窗
	closeButton.addEventListener('click', function (){
		popup.style.display = 'none';
	});
}


// 显示弹窗并设置错误提示文字
function showPromptMessagePopup(message,type =1) {
	// 获取弹窗元素
	const popup = document.getElementById('nmx_jimeng_popup');
	// 获取错误提示元素
	const errorText = document.getElementById('nmx_jimeng_popup_message');
	errorText.textContent = message;
	popup.style.display = 'block';
	if(type == 2)
	{
		// 获取关闭按钮元素
		const closeButton = document.getElementById('nmx_jimeng_close_popupbtn');
		closeButton.style.display = 'none';
		setTimeout(function (){
			closeButton.click();
		},2000);
	}
}

/**
 * 引入css文件
 * @param url
 */
function addStylesheet(url) {
	const linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	linkElement.type = "text/css";
	linkElement.href = chrome.runtime.getURL(url);
	document.head.appendChild(linkElement);
}

async function startDownloadData()
{
	let mediaDialog = document.querySelector("div[role='dialog']")
	if(mediaDialog) {
		let fileName = "";
		let mediaUrl = "";
		//获取 div id 前缀包含 dreamina-video-player- 的对像
		let videoObj = mediaDialog.querySelector("div[id^='dreamina-video-player-']");
		if(videoObj) {
			fileName = "video_" + Date.now() + ".mp4";
			mediaUrl = videoObj.querySelector("video").src;
		}
		//获取 img data-apm-action=ai-generated-image-detail-card
		let imgObj = mediaDialog.querySelector("img[data-apm-action='ai-generated-image-detail-card']");
		if(imgObj) {
			fileName = "image_" + Date.now() + ".webp";
			mediaUrl = imgObj.src;
		}
		console.log("fileName:", fileName);
		downloadStreamVideo(mediaUrl, fileName);
	}
}


function showLoadingProgressBar()
{
	let loadingProgressBar = document.querySelector("div.custom-loading-progress-bar");
	if(!loadingProgressBar)
	{
		let html = "<div class=\"custom-progress\"></div>";
		loadingProgressBar = document.createElement("div");
		loadingProgressBar.classList.add("custom-loading-progress-bar");
		loadingProgressBar.innerHTML = html;
		document.body.appendChild(loadingProgressBar);
	}
	loadingProgressBar.style.display = 'block';
}

function closeLoadingProgressBar()
{
	let loadingProgressBar = document.querySelector("div.custom-loading-progress-bar");
	if(loadingProgressBar)
	{
		loadingProgressBar.style.display = 'none';
	}
}

function downloadStreamVideo(url, fileName) {
	console.log("stream download!");
	showLoadingProgressBar();
	fetch(url)
		.then(response => {
			const fileStream = response.body;
			const reader = fileStream.getReader();

			return new ReadableStream({
				start(controller) {
					function read() {
						reader.read().then(({ done, value }) => {
							if (done) {
								controller.close();
								return;
							}
							controller.enqueue(value);
							read();
						});
					}
					read();
				}
			});
		})
		.then(stream => new Response(stream))
		.then(response => response.blob())
		.then(blob => {
			// 创建下载链接并触发下载
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = fileName;
			link.click();
			URL.revokeObjectURL(link.href);
			closeLoadingProgressBar();
		})
		.catch(error => {
			closeLoadingProgressBar();
			showPromptMessagePopup("视频下载异常，请重新点击下载！");
			console.error("Error downloading the file:", error);
		});
}

function initSetting(callback)
{
	// 获取存储的值
	chrome.storage.local.get('nmx_jimeng_setting', function (data) {
		if(callback) callback();
	});
}
// 在页面加载完成后插入弹层和引入CSS文件
window.onload = function() {
	currentUrl = window.location.href;
	initToolButton();
	initPromptMessagePopup();
	addStylesheet("css/page_layer.css");
};
/**
 * 事件监听
 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	window.focus();
	console.log(message.type);
	if(message.type == 'check_mkey_complete')
	{
		activiteToolButton();
		if(message.data.hasOwnProperty("code") && message.data.code !=0)
		{
			showPromptMessagePopup(message.data.message);
		}
		else
		{
			startDownloadData();
		}
	}
});
