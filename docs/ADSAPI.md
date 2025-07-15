Open Browser
Basics
Path: /api/v1/browser/start

Method: GET
Description: To open a browser, you need to specify the profile ID. After a successful launch, you can obtain the browser's debug interface for executing Selenium and Puppeteer automation. Selenium requires the use of a Webdriver that matches the corresponding browser's core version. Ensure that your application is updated to version 3.4.1 or higher. After launching the browser, you can retrieve the path to the corresponding Webdriver from the return value.



Request Parameters
Optional parameters in the query can be omitted.

Name	Necessary	Default	Example	Description	Remarks
user_id	YES	-	h1yynkm	Unique profile ID, generated after creating profile	
serial_number	NO	-	123	Priority will be given to user id when user id is filled.	
open_tabs	NO	0	1	Open a platform or historical page. 0: Open (Default setting); 1: Close	should update to V2.4.2.9 or above
ip_tab	NO	1	0	Whether to open the ip detection page, 0: not open, 1: open (default)	should update to V2.5.7.9 or above
new_first_tab	NO	0	1	Whether to use the new version of the ip detection page: 1: new version, 0: old version (default)	should update to V2.6.6.9 or above
launch_args	NO	-	["--window-position=400,0","--blink-settings=imagesEnabled=false", "--disable-notifications"]	Browser startup parameters. eg: --blink-settings=imagesEnabled=false: Prohibit image loading. --disable-notifications: Disable notifications
p.s.: If launch_args are set both for API and the profile, priority will be given to the ones in API settings.	should update to V2.4.6.7 or above
headless	NO	0	1	Whether to start the headless browser 0:NO (Default) 1:YES	should update to V2.4.6.7 or above
disable_password_filling	NO	0	1	Whether to disable the function of filling password 0:NO (Default) 1:YES	should update to V2.4.6.7 or above
clear_cache_after_closing	NO	0	1	Whether to delete the cache after closing the browser 0:NO (Default) 1:YES	should update to V2.4.7.6 or above. If the disk space is insufficient, it is recommended to set this parameter to 1
enable_password_saving	NO	0	1	Whether to allow password saving 0:NO (Default) 1:YES	should update to V2.4.8.7 or above
cdp_mask	No	1	1	Whether to mask the cdp detection. 1: Yes (default), 0: No.	
device_scale	NO	-	1	Only valid for mobile OS. Range 0.1 to 2, 1 is 100%.	


Return Data

//Operation succeeded
{
  "code":0,
  "data":{
    "ws":{
      "selenium":"127.0.0.1:xxxx",    //Browser debug interface, used for selenium automation
      "puppeteer":"ws://127.0.0.1:xxxx/devtools/browser/xxxxxx"  //Browser debug interface, used for puppeteer automation
    },
    "debug_port": "xxxx", //debug port
    "webdriver": "C:\\xxxx\\chromedriver.exe" //webdriver path
  },
  "msg":"success"
}

//Operation failed
{
  "code":-1,
  "data":{},
  "msg":"failed"
}


Close Browser
Basics
Path： /api/v1/browser/stop

Method： GET
Description: To close a browser, you need to specify the profile ID.

Request Parameters
Optional parameters in the query can be omitted.

Name	Necessary	Default	Example	Description
user_id	YES	-	h1yynkm	Unique profile ID, generated after creating profile
serial_number	NO	-	123	Priority will be given to user id when user id is filled.


Return Data

//Operation succeeded
{
  "code":0,
  "data":{},
  "msg":"success"
}

//Operation failed
{
  "code":-1,
  "data":{},
  "msg":"failed"
}


Check Browser Status
Basics
Path： /api/v1/browser/active

Method： GET
Description: To check the startup status of the browser, you need to specify the profile ID.

Request Parameters
Optional parameters in the query can be omitted.

Name	Necessary	Default	Example	Description
user_id	YES	-	h1yynkm	Unique profile ID, generated after importing account
serial_number	NO	-	123	Priority will be given to user id when user id is passed.


Return Data

//Operation succeeded
{
  "code":0,
  "data":{
    "status": "Active",    //Open in browser: “Active”, Close in browser: “Inactive”
    "ws":{
      "selenium":"127.0.0.1:xxxx",    //Browser debug interface, used for selenium automation
      "puppeteer":"ws://127.0.0.1:xxxx/devtools/browser/xxxxxx"   //Browser debug interface, used for puppeteer automation
    }
  },
  "msg":"success"
}

//Operation failed
{
  "code":-1,
  "data":{},
  "msg":"failed"
}




Basic Information
Path： /api/v1/browser/local-active

Method： GET

Description：Queries all open browsers on the current device

Returning Data

//Operation succeeded
{
    "code": 0,
    "msg": "success",
    "data": {
        "list": [
            {
                "user_id": "xxx",
                "ws": {
                    "puppeteer": "ws://127.0.0.1:xxxx/devtools/browser/xxxxxx", //Browser debug interface, used for selenium automation
                    "selenium": "127.0.0.1:xxxx" //Browser debug interface, used for puppeteer automation
                },
                "debug_port": "xxxx",
                "webdriver": "xxxx"
            }
        ]
    }
}


//Operation failed
{
  "code":-1,
  "data":{},
  "msg":"failed"
}


user_proxy_config
user_proxy_config: Information about account proxy configuration. AdsPower supports frequently used proxy software and protocol.

Name	Type	Necessary	Default	Example	Description
proxy_soft	text	YES	-	brightdata	Currently supports brightdata, brightauto, oxylabsauto, 922S5auto，ipideaauto，
ipfoxyauto，
922S5auth,
kookauto,
ssh, other, noproxy
proxy_type	text	NO	-	socks5	Currently supports http, https, socks5; For no_proxy, you may pass the parameter or not
proxy_host	text	NO	-	pr.oxylabs.io	Address of the proxy server, users can enter domain name or IP; For no_proxy, you may pass the parameter or not
proxy_port	text	NO	-	123	Port of the proxy server; For no_proxy, you may pass the parameter or not
proxy_user	text	NO	-	abc	Proxy account name
proxy_password	text	NO	-	xyz	Proxy account password
proxy_url	text	NO	-	http://www.xxx.com/	The link to change IP is used for mobile proxies and only supports http/https/socks5 proxy.
1. You can change proxy IP address via the link
2. If many profiles have the same proxy settings, IP address of these profiles will be changed simultaneously after refreshing proxy IP address
global_config	text	NO	0	1	Information on the list of accounts managed using the proxy


For user_proxy_config to pass corresponding JSON object is required, for example,

agent	JSON	instructions
brightdata	{"proxy_soft":"brightdata","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xxx","proxy_password":"**"}	proxy_type supports settings to use http, https, and socks5.
brightauto	{"proxy_soft":"brightauto","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xxx","proxy_password":"**"}	-
oxylabsauto	{"proxy_soft":"oxylabsauto","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xx","proxy_password":"**"}	-
ipideaauto	{"proxy_soft":"ipideaauto","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xx","proxy_password":"**"}	proxy_type supports settings to use http, socks5
ipfoxyauto	{"proxy_soft":"ipfoxyauto","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xx","proxy_password":"**"}	proxy_type supports settings to use http, socks5
922S5auth	{"proxy_soft":"922S5auth","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xx","proxy_password":"**"}	-
kookauto	{"proxy_soft":"kookauto","proxy_type":"http","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xx","proxy_password":"**"}	proxy_type supports settings to use http, socks5
922S5auto	{"proxy_soft":"922S5auto"}	Using 922S5auto, just pass the value of proxy_soft
other	{"proxy_soft":"other","proxy_type":"socks5","proxy_host":"xxxx",
"proxy_port":"xx","proxy_user":"xxx","proxy_password":"**"}	proxy_type supports settings to use http, https, and socks5.
no_proxy	{"proxy_soft":"no_proxy"}	-
