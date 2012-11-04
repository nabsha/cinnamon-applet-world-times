const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const GLib = imports.gi.GLib;
const GTop = imports.gi.GTop;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Main = imports.ui.main;

function MyMenu(launcher, orientation) {
    this._init(launcher, orientation);
}
MyMenu.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,
    _init: function(launcher, orientation) {
        this._launcher = launcher;
        PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
    }
}

function MyApplet(metadata, orientation) {
	this._init(metadata, orientation);
};

MyApplet.prototype = {
	__proto__: Applet.TextApplet.prototype,

    _init: function(metadata, orientation) {
        Applet.TextApplet.prototype._init.call(this, orientation);
        this.path = metadata.path;
        this.settingsFile = this.path+"/settings.json";

		try {
			this.loadSettings();
			this.buildContextMenu();

			this.update();
		}
		catch (e) {
			global.logError(e);
		}
	},
	
	makeMenu: function() {
		this.menu.removeAll();
		this.menuitemInfo = new PopupMenu.PopupMenuItem("No network monitored. Please select one right-clicking the applet.", { reactive: false });
		this.menu.addMenuItem(this.menuitemInfo);
	},


	buildContextMenu: function() {
		this._applet_context_menu.removeAll();
		
		this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		let menuitem = new PopupMenu.PopupMenuItem("Settings");
		menuitem.connect('activate', Lang.bind(this, this.openSettings));
		this._applet_context_menu.addMenuItem(menuitem);
	},
	
	openSettings: function() {
		[success, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(this.path, ["/usr/bin/gjs","settings.js",this.settingsFile], null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
		GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, this.onSettingsWindowClosed));
	},
	
	onSettingsWindowClosed: function(pid, status, requestObj) {
		this.loadSettings();
	},
	

	on_applet_clicked: function(event) {
		if(!this.menu.isOpen) {
			this.makeMenu();
		}
		this.menu.toggle();
	},

    update:function () {
        var d_now = new Date();
        var d_offset = new Date(d_now);
        d_offset.setHours(d_now.getHours() + this.settings.HoursOffset);
	var month = d_offset.getMonth() + 1;
	var day = d_offset.getDate();
	var hr = d_offset.getHours();
	var mi = d_offset.getMinutes();
	var sec = d_offset.getSeconds();
	if (hr < 10)
		hr = "0" + hr;
	if (mi < 10)
		mi = "0" + mi;
	if (sec < 10)
		sec = "0" + sec;

	this.set_applet_label(this.settings.Location + ":" + day + "/" + month + ", " + hr + ":" + mi + ":" + sec);
        Mainloop.timeout_add(1000, Lang.bind(this, this.update));

      },
	
	
    loadSettings: function() {
        try {
            global.logError("Setting path: " + this.path);
            var dir = Gio.file_new_for_path(this.path);
            global.logError("Setting filepath: " + this.settingsFile);
            var prefsFile = dir.get_child(this.settingsFile);

            global.logError("Reading File" + prefsFile.get_path());
            var settingData = Cinnamon.get_file_contents_utf8_sync(prefsFile.get_path());
            global.logError("PArsing JSON");
            this.settings = JSON.parse(settingData);
        } catch(e) {
            global.logError(e);
            global.logError("Settings file not found. Using default values.");
            this.settings = JSON.parse('{"Location":"Sydney","HoursOffset":"8"}');
        }
    },	
	saveSettings: function() {
		let file = Gio.file_new_for_path(this.settingsFile);
		let outputFile = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
		let out = Gio.BufferedOutputStream.new_sized(outputFile, 1024);
		Cinnamon.write_string_to_stream(out, JSON.stringify(this.settings));
		out.close(null);
	}
};

function main(metadata, orientation) {
	let myApplet = new MyApplet(metadata, orientation);
	return myApplet;
}
