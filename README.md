# algo-mission
# Ian Felstead

Algorithm mission: Basically a bit like a web version of BigTrak/BeeBot.

In many UK primary schools BigTrak has made a comeback in the form of BeeBot.
Devices like these follow simple directional instructions which in theory provide kids with an introductory experience of algorithms and the associated joys of working with machines that do what they're told rather than what you want.

This project aims to create a three.js based path programmable object much like the BigTrak/BeeBot.

Screenshot:
![alt tag](https://cloud.githubusercontent.com/assets/5990178/19145914/21829310-8ba9-11e6-9619-04fbb6d4f722.JPG)

To run locally you can use node.js's http-server (otherwise see https://github.com/mrdoob/three.js/wiki/How-to-run-things-locally).
e.g.
	install node.js
	npm install http-server -g
	navigate to your algo-mission dir
	http-server
	point your browser at http://127.0.0.1:8080/algo-mission.html

Ian Felstead

Notices;

Skybox (textures/sky_twilight.jpg);
Optikz 2004 (from a post on blenderartists.org)

Cartoon bus model (models/ToonBus_VijayKumar.json & textures/Toon_Bus_Texture.jpg);
Toon Bus by VijayKumar is licensed under CC Attribution https://skfb.ly/PHVP
(converted to JSON via Blender & three.js Blender export tool but otherwise untouched)

Button art (textures/*.png);
From http://www.clipartpanda.com/

Road art (textures/road/*)
Modified version of Road_test.png from www.adebgamesoft.be
http://creativecommons.org/publicdomain/zero/1.0/
(http://opengameart.org/content/top-down-road-tileset)
