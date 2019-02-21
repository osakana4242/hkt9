
class Assert {
	static eq(a, b) {
		if (a === b) return;
		throw `${a} vs ${b}`;
	}
}

class Ticker {
	constructor() {
		this.frameCount = 0;
		this.deltaTime = 0;
		this.time = 0;
	}

	static next(ticker, deltaTime) {
		const n = new Ticker();
		n.frameCount = ticker.frameCount + 1;
		n.deltaTime = deltaTime;
		n.time = ticker.time + deltaTime;
		return n;
	}
}

class Time {
	static secToTime(sec) {
		return parseInt(sec * 1000);
	}
	static msecToTime(sec) {
		return parseInt(sec);
	}
}

class MathUtil {
	static progress01(a, b) {
		if (b <= 0) return 1;
		return a / b;
	}
	static lerp(a, b, t) {
		return a + (b - a) * t;
	}
	static lerpAngle(a, b, t) {
		const diff1 = b - a;
		const diff2 = MathUtil.normalizeDeltaAngle(diff1);
		return a + diff2 * t;
	}
	static deltaAngle(a, b) {
		return MathUtil.normalizeDeltaAngle(b - a);
	}
	static distanceAngle(a, b) {
		return Math.abs(MathUtil.deltaAngle(a, b))
	}
	static normalizeDeltaAngle(diff1) {
		diff1 = diff1 % 360;
		if (Math.abs(diff1) < 180) return diff1;
		const diff2 = (0 < diff1) ?
			diff1 - 360 :
			diff1 + 360;
		return diff2;
	}
}

class LerpUtil {
	static lerp(a, b, t) {
		return a + (b - a) * t;
	}

	static easeIn(a, b, t) {
		return LerpUtil.lerp(a, b, t * t);
	}

	static easeOut(a, b, t) {
		const t2 = 1.0 - t;
		return LerpUtil.lerp(a, b, 1.0 - (t2 * t2));
	}
}

Assert.eq(179, MathUtil.normalizeDeltaAngle(179));
Assert.eq(-179, MathUtil.normalizeDeltaAngle(-179));
Assert.eq(179, MathUtil.normalizeDeltaAngle(-181));
Assert.eq(178, MathUtil.normalizeDeltaAngle(-182));
Assert.eq(2, MathUtil.normalizeDeltaAngle(-358));
Assert.eq(1, MathUtil.normalizeDeltaAngle(-359));
Assert.eq(-179, MathUtil.normalizeDeltaAngle(181));
Assert.eq(-178, MathUtil.normalizeDeltaAngle(182));
Assert.eq(-2, MathUtil.normalizeDeltaAngle(358));
Assert.eq(-1, MathUtil.normalizeDeltaAngle(359));

Assert.eq(-45, MathUtil.lerpAngle(0, 270, 0.5));
Assert.eq(-90, MathUtil.lerpAngle(0, 270, 1));

class LatLngUtil {
	static lerp(a, b, t) {
		return new google.maps.LatLng(
			MathUtil.lerpAngle(a.lat(), b.lat(), t),
			MathUtil.lerpAngle(a.lng(), b.lng(), t)
		);
	}
	static distance(a, b) {
		const dx = MathUtil.deltaAngle(a.lat(), b.lat());
		const dy = MathUtil.deltaAngle(a.lng(), b.lng());
		const distance = Math.sqrt(dx * dx + dy * dy);
		return distance;
	}
}
// 180, -180 

class BulletHome {
	constructor() {
		this.fireInterval = Time.secToTime(0.5);
		this.fireTime = 0;
	}
}

class Vector2 {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}

	copyFrom(other) {
		this.x = other.x;
		this.y = other.y;
	}

	toLatLng() {
		return new google.maps.LatLng(this.y, this.x);
	}
}

class Explosion {
	constructor(ownerId, position, radius, duration) {
		this.ownerId = ownerId;
		this.position = position;
		this.time = 0;
		this.radius = radius;
		this.duration = duration;
		this.state = '';
	}
}

class Bullet {
	constructor(ownerId, startPosition, targetPosition, speed) {
		this.ownerId = ownerId;
		this.position = startPosition;
		this.startPosition = startPosition;
		this.targetPosition = targetPosition;

		const distance = LatLngUtil.distance(targetPosition, startPosition);

		this.time = 0;
		this.duration = Time.secToTime(distance / speed);
		this.state = '';
		this.positionArr = [
			startPosition,
			startPosition,
		];
	}
}

class RandomUtil {
	static sign() {
		return (Math.random() < 0.5) ? -1 : 1;
	}
}

class App {
	constructor() {
		this.config = {
			fps: 60,
		};

		this.homePosition = new google.maps.LatLng(35.6811673, 139.7670516);

		const latLng = this.homePosition;
		const options = {
			zoom: 4,
			center: latLng,
			mapTypeId: 'satellite',
			clickableIcons: false,
			disableDefaultUI: true,
			navigationControll: false,
			draggable: true,
			disableDoubleClickZoom: true,
		};
		this.info = document.getElementById('info');
		this.map = new google.maps.Map(document.getElementById('map'), options);
		this.ticker = new Ticker();
		this.polylineArr = [];
		this.bulletArr = [];
		this.bulletHome = new BulletHome();
		this.explosionArr = [];

		this.nextClickArr = [];
		this.clickArr = [];
		this.score = 0;
		this.damage = 0;

		const app = this;
		// https://developers.google.com/maps/documentation/javascript/events
		google.maps.event.addListener(this.map, 'mouseup', _evt => {
			app.nextClickArr.push(_evt);
			// console.log(`unko ${_evt.latLng.lat()} ${_evt.latLng.lng()}`);
		});

	}

	static update(app) {
		{
			const tmpArr = app.clickArr;
			tmpArr.splice(0, tmpArr.length);
			app.clickArr = app.nextClickArr;
			app.nextClickArr = tmpArr;
		}

		App.clearPolyline(app);
		App.updatePlayerShot(app);
		App.updateBulletHome(app);
		App.updateBullet(app);
		App.updateExplosion(app);
		App.removeBullet(app);
		App.removeExplosion(app);
		app.info.innerHTML = `スコア ${app.score} 被害 ${app.damage}`;
	}

	static clearPolyline(app) {
		const arr = app.polylineArr;
		arr.forEach(_item => {
			_item.setMap(null);
		});
		arr.splice(0, arr.length);
	}

	static findPlace(position) {
		let minDist = 999;
		let minI = 0;

		for (let i = 0; i < japanPlaces.length; i++) {
			const place = japanPlaces[i];
			const dist = LatLngUtil.distance(position, new google.maps.LatLng(place[2], place[3]));
			if (minDist < dist) continue;
			minDist = dist;
			minI = i;
		}
		return japanPlaces[minI];
	}

	static updatePlayerShot(app) {
		for (let i = 0; i < app.clickArr.length; i++) {
			const evt = app.clickArr[i];
			//const startPlace = japanPlaces[parseInt(Math.random() * japanPlaces.length)];
			const startPlace = App.findPlace(evt.latLng);

			const startBasePosition = new google.maps.LatLng(startPlace[2], startPlace[3]);
			const endBasePosition = new google.maps.LatLng(evt.latLng.lat(), evt.latLng.lng());


			const latOffset = RandomUtil.sign() * (Math.random() * 0.1);
			const lngOffset = RandomUtil.sign() * (Math.random() * 0.1);

			const latOffset2 = RandomUtil.sign() * (Math.random() * 0);
			const lngOffset2 = RandomUtil.sign() * (Math.random() * 0);

			// 1, 0
			// -1 + (Math.random() * 2)

			const bullet = new Bullet(
				1,
				new google.maps.LatLng(startBasePosition.lat() + latOffset, startBasePosition.lng() + lngOffset),
				new google.maps.LatLng(endBasePosition.lat() + latOffset2, endBasePosition.lng() + lngOffset2),
				40
			);
			app.bulletArr.push(bullet);
		}
	}

	static updateBulletHome(app) {
		const bulletHome = app.bulletHome;
		if (bulletHome.fireInterval <= bulletHome.fireTime) {
			bulletHome.fireTime = 0;

			const startPlace = worldPlaces[parseInt(Math.random() * worldPlaces.length)];
			const endPlace = japanPlaces[parseInt(Math.random() * japanPlaces.length)];

			const startBasePosition = new google.maps.LatLng(startPlace[2], startPlace[3]);
			const endBasePosition = new google.maps.LatLng(endPlace[2], endPlace[3]);


			const latOffset = RandomUtil.sign() * (Math.random() * 0.1);
			const lngOffset = RandomUtil.sign() * (Math.random() * 0.1);

			const latOffset2 = RandomUtil.sign() * (Math.random() * 1);
			const lngOffset2 = RandomUtil.sign() * (Math.random() * 1);

			// 1, 0
			// -1 + (Math.random() * 2)

			const bullet = new Bullet(
				2,
				new google.maps.LatLng(startBasePosition.lat() + latOffset, startBasePosition.lng() + lngOffset),
				new google.maps.LatLng(endBasePosition.lat() + latOffset2, endBasePosition.lng() + lngOffset2),
				3
			);
			app.bulletArr.push(bullet);
		}
		bulletHome.fireTime += app.ticker.deltaTime;
	}

	static removeBullet(app) {
		const bulletArr = app.bulletArr;
		for (let i = bulletArr.length - 1; 0 <= i; i--) {
			const bullet = bulletArr[i];
			if (bullet.time < bullet.duration && bullet.state !== 'explosion') continue;
			const ownerId = (bullet.ownerId === 1) ? 
				1 :
				(bullet.state === 'explosion') ?
					1 :
					2;
			if (ownerId === 2) {
				app.damage += 100;
			}
			const explosion = new Explosion(ownerId, bullet.position, 1, Time.secToTime(1));
			app.explosionArr.push(explosion);
			bulletArr.splice(i, 1);
		}
	}

	static removeExplosion(app) {
		const explosionArr = app.explosionArr;
		for (let i = explosionArr.length - 1; 0 <= i; i--) {
			const explosion = explosionArr[i];
			if (explosion.time < explosion.duration) continue;
			explosionArr.splice(i, 1);
		}
	}

	static updateBullet(app) {
		{
			app.bulletArr.forEach(bullet => {
				if (bullet.state === 'explosion') return;
				const progress = MathUtil.progress01(bullet.time, bullet.duration);
				bullet.time += app.ticker.deltaTime;
				const nextPos = LatLngUtil.lerp(bullet.startPosition, bullet.targetPosition, progress);
				bullet.position = nextPos;
				bullet.positionArr.push(nextPos);

				const linePositions = [];
				{
					const arr = bullet.positionArr;
					arr.forEach(_item => linePositions.push(_item));
					const limit = 4;
					if (limit < arr.length) {
						arr.splice(0, arr.length - limit);
					}
				}

				const polyline = new google.maps.Polyline({
					path: linePositions,
					strokeColor: bullet.ownerId === 1 ? '#ffffff' : '#ff00ff',
					strokeOpacity: 1.0,
					strokeWeight: 3
				});
				polyline.setMap(app.map);
				app.polylineArr.push(polyline);
			});
		}
	}

	static updateExplosion(app) {
		const explosionArr = app.explosionArr;
		explosionArr.forEach(explosion => {
			const progress = MathUtil.progress01(explosion.time, explosion.duration);
			explosion.time += app.ticker.deltaTime;
			const radius = LerpUtil.easeIn(explosion.radius, 0, progress);

			{
				// const baseTriangleCoords = [
				// 	new google.maps.LatLng(1, 0),
				// 	new google.maps.LatLng(0.7, 0.7),
				// 	new google.maps.LatLng(0, 1),
				// 	new google.maps.LatLng(-0.7, 0.7),
				// 	new google.maps.LatLng(-1, 0),
				// 	new google.maps.LatLng(-0.7, -0.7),
				// 	new google.maps.LatLng(0, -1),
				// 	new google.maps.LatLng(0.7, -0.7),
				// 	new google.maps.LatLng(1, 0),
				// ];
				const baseTriangleCoords = [];

				for (let i = 0, iMax = 16; i < iMax; i++) {
					const rad = Math.PI * 2 * i / iMax;
					baseTriangleCoords.push(
						new google.maps.LatLng(
							Math.sin(rad),
							Math.cos(rad)
						)
					);
				}

				const triangleCoords = [];
				baseTriangleCoords.forEach(_item => {
					const p = explosion.position;
					const p2 = new google.maps.LatLng(p.lat() + _item.lat() * radius, p.lng() + _item.lng() * radius);
					triangleCoords.push(p2);
				});

				// Construct the polygon
				const polygon = new google.maps.Polygon({
					paths: triangleCoords,
					strokeColor: "#000000",
					strokeOpacity: 1,
					strokeWeight: 0,
					fillColor: explosion.ownerId === 1 ? '#ffff00' : '#ff0000',
					fillOpacity: 1,
					clickable: false,
					draggable: false,
					editable: false,
				});

				polygon.setMap(app.map);
				app.polylineArr.push(polygon);
			}
		});

		const bulletArr = app.bulletArr;
		for (let i1 = 0; i1 < explosionArr.length; i1++) {
			var explosion = explosionArr[i1];
			if (explosion.ownerId !== 1) continue;

			const progress = MathUtil.progress01(explosion.time, explosion.duration);
			const radius = LerpUtil.easeIn(explosion.radius, 0, progress);

			for (let i2 = 0; i2 < bulletArr.length; i2++) {
				var bullet = bulletArr[i2];
				if (bullet.ownerId === 1) continue;
				const dist = LatLngUtil.distance(bullet.position, explosion.position);
				if (radius < dist) continue;
				app.score += 100;
				bullet.state = "explosion";
			}
		}
	}


	static loop(app) {
		try {
			App.update(app);
			const deltaTime = Math.max(1, Time.secToTime(1 / app.config.fps));
			app.ticker = Ticker.next(app.ticker, deltaTime);
			setTimeout(App.loop, deltaTime, app);
		} catch (ex) {
			throw ex;
		}
	}
}

const japanPlaces = [
	['北海道', '札幌市', 43.055248, 141.345505],
	['北海道', '旭川市', 43.771179, 142.368805],
	['北海道', '稚内市', 45.401611, 141.682693],
	['北海道', '釧路市', 42.97427, 144.382797],
	['北海道', '帯広市', 42.90675, 143.183502],
	['北海道', '室蘭市', 42.336529, 140.9944],
	['北海道', '函館市', 41.78677, 140.744003],
	['北海道', '小樽市', 43.194462, 141.003693],
	['青森県', '青森市', 40.824589, 140.755203],
	['青森県', '八戸市', 40.523918, 141.5233],
	['秋田県', '秋田市', 39.747292, 140.083405],
	['岩手県', '盛岡市', 39.697189, 141.1539],
	['山形県', '酒田市', 38.910728, 139.836899],
	['宮城県', '仙台市', 38.254162, 140.891403],
	['福島県', '福島市', 37.748909, 140.479507],
	['茨城県', '水戸市', 36.345341, 140.369995],
	['栃木県', '宇都宮市', 36.554241, 139.897705],
	['千葉県', '館山市', 34.985729, 139.854095],
	['群馬県', '高崎市', 36.325371, 139.016205],
	['東京都', '東京都', 35.680909, 139.767372],
	['東京都', '新宿区', 35.690329, 139.700546],
	['東京都', '八王子市', 35.66325, 139.331207],
	['神奈川県', '横浜市', 35.428784, 139.646463],
	['山梨県', '甲府市', 35.657372, 138.577103],
	['新潟県', '新潟市', 37.920841, 139.053299],
	['長野県', '長野市', 36.648708, 138.192307],
	['長野県', '松本市', 36.23214, 137.976105],
	['富山県', '富山市', 36.691238, 137.220093],
	['石川県', '金沢市', 36.5625, 136.646805],
	['福井県', '福井市', 36.066601, 136.223801],
	['静岡県', '静岡市', 34.974331, 138.389099],
	['愛知県', '名古屋市', 35.154919, 136.920593],
	['岐阜県', '岐阜市', 35.410198, 136.761505],
	['三重県', '津市', 34.719109, 136.5168],
	['奈良県', '奈良市', 34.679359, 135.836105],
	['京都府', '京都市', 35.009129, 135.754807],
	['京都府', '舞鶴市', 35.441528, 135.332901],
	['大阪府', '大阪市', 34.702509, 135.496505],
	['和歌山県', '和歌山市', 34.221981, 135.166107],
	['兵庫県', '神戸市', 34.677484, 135.175479],
	['兵庫県', '姫路市', 34.829361, 134.703094],
	['岡山県', '岡山市', 34.665218, 133.922501],
	['岡山県', '倉敷市', 34.60474, 133.768707],
	['広島県', '広島市', 34.37756, 132.444794],
	['広島県', '呉市', 34.236961, 132.564606],
	['広島県', '尾道市', 34.402531, 133.198502],
	['山口県', '山口市', 34.176689, 131.479797],
	['山口県', '下関市', 33.953159, 130.939102],
	['鳥取県', '鳥取市', 35.497131, 134.234604],
	['島根県', '松江市', 35.469051, 133.0616],
	['徳島県', '徳島市', 34.066101, 134.562302],
	['香川県', '高松市', 34.338539, 134.046204],
	['高知県', '高知市', 33.55201, 133.5383],
	['愛媛県', '松山市', 33.835091, 132.774902],
	['福岡県', '北九州市', 33.88073, 130.840103],
	['福岡県', '福岡市', 33.579788, 130.402405],
	['佐賀県', '佐賀市', 33.246601, 130.303101],
	['大分県', '大分市', 33.23111, 131.606201],
	['熊本県', '熊本市', 32.788521, 130.714905],
	['長崎県', '長崎市', 32.765419, 129.866302],
	['長崎県', '佐世保市', 33.159969, 129.733902],
	['宮崎県', '宮崎市', 31.907379, 131.423203],
	['鹿児島県', '鹿児島市', 31.570539, 130.552505],
	['沖縄県', '那覇市', 26.20483, 127.692398],
	['沖縄県', '石垣市', 24.340565, 124.156201],
];

const worldPlaces = [
	['アディスアベバ', 'エチオピア', 9.022736, 38.746799],
	['アテネ', 'ギリシャ共和国', 37.97362, 23.718989],
	['アビジャン', 'コートジボワール', 5.336318, -4.027751],
	['アレキサンドリア', 'エジプト', 31.228, 29.957718],
	['アンマン', 'ヨルダン', 31.949381, 35.932911],
	['イスタンブール', 'トルコ共和国', 41.06596, 29.006069],
	['ウィーン', 'オーストリア', 48.201841, 16.364571],
	['ウラジオストック', 'ロシア連邦', 43.125469, 131.886398],
	['ウランバートル', 'モンゴル国', 47.921378, 106.90554],
	['エルサレム', 'イスラエル', 31.77375, 35.22522],
	['オークランド', 'ニュージーランド', -36.904148, 174.760498],
	['オタワ', 'カナダ', 45.411572, -75.698194],
	['カイロ', 'エジプト', 30.064742, 31.249509],
	['カサブランカ', 'モロッコ', 33.605381, -7.631949],
	['カブール', 'アフガニスタン', 34.528455, 69.171703],
	['カラカス', 'ベネズエラ・ボリバル共和国', 10.491016, -66.902061],
	['キエフ', 'ウクライナ', 50.453629, 30.503828],
	['キンシャサ', 'コンゴ民主共和国', -4.320836, 15.29866],
	['グアテマラシティ', 'グアテマラ', 14.624795, -90.532818],
	['クアラルンプール', 'マレーシア', 3.15021, 101.707703],
	['クウェート', 'クウェート国', 29.329404, 48.00393],
	['クライストチャーチ', 'ニュージーランド', -43.523529, 172.638199],
	['ケープタウン', '南アフリカ共和国', -33.924788, 18.429916],
	['コペンハーゲン', 'デンマーク王国', 55.692829, 12.554125],
	['コルカタ', 'インド', 22.543539, 88.334221],
	['コロンボ', 'スリランカ', 6.927468, 79.848358],
	['サラエボ', 'ボスニア・ヘルツェゴビナ連邦', 43.85643, 18.41342],
	['サンタフェデボゴタ', 'コロンビア', 4.609866, -74.08205],
	['サンパウロ', 'ブラジル', -23.581301, -46.622898],
	['サンプトペテルブルグ', 'ロシア連邦', 59.951889, 30.453329],
	['サンフランシスコ', 'アメリカ合衆国', 37.775, -122.41833],
	['サンホセ', 'コスタリカ', 9.927128, -84.082012],
	['シアトル', 'アメリカ合衆国', 47.60639, -122.33083],
	['シカゴ', 'アメリカ合衆国', 41.85, -87.65],
	['シドニー', 'オーストラリア', -33.891576, 151.241709],
	['ジブチ', 'ジブチ共和国', 11.588599, 43.14585],
	['ジャカルタ', 'インドネシア', -6.211544, 106.845172],
	['上海（シャンハイ）', '中国', 31.247869, 121.472702],
	['シンガポール', 'シンガポール', 1.298828, 103.824898],
	['スコピエ', 'マケドニア共和国', 42.003812, 21.452246],
	['ストックホルム', 'スウェーデン', 59.286948, 18.072977],
	['ソウル', '韓国', 37.532308, 126.95744],
	['ソフィア', 'ブルガリア', 42.710543, 23.323827],
	['台北（タイペイ）', '台湾', 25.035089, 121.506699],
	['ダカール', 'セネガル', 14.68668, -17.45192],
	['タシケント', 'ウズベキスタン', 41.305229, 69.268967],
	['ダッカ', 'バングラデシュ', 23.709921, 90.407143],
	['ダブリン', 'アイルランド共和国', 53.34156, -6.257347],
	['ダマスカス', 'シリア・アラブ共和国', 33.519299, 36.31345],
	['チュニス', 'チュニジア共和国', 36.81881, 10.16596],
	['テヘラン', 'イラン', 35.696216, 51.422945],
	['ドゥシャンベ', 'タジキスタン', 38.565356, 68.775835],
	['ドバイ', 'アラブ首長国連邦', 25.281892, 51.517541],
	['トビリシ', 'グルジア', 41.709981, 44.792998],
	['トリポリ', 'リビア', 32.876174, 13.187507],
	['ナイロビ', 'ケニア共和国', -1.274359, 36.813106],
	['ニューデリー', 'インド', 28.63769, 77.205824],
	['ニューヨーク', 'アメリカ合衆国', 40.71417, -74.00639],
	['パース', 'オーストラリア', -31.932854, 115.86194],
	['バグダッド', 'イラク共和国', 33.33248, 44.418399],
	['パナマ', 'パナマ共和国', 8.994269, -79.518792],
	['ハノイ', 'ベトナム', 21.02425, 105.854694],
	['ハバナ', 'キューバ', 23.1168, -82.388557],
	['パリ', 'フランス', 48.85284, 2.349857],
	['バルセロナ', 'スペイン', 41.384855, 2.172164],
	['バンクーバー', 'カナダ', 49.242609, -123.099399],
	['バンコク', 'タイ王国', 13.73078, 100.521004],
	['ビサウ', 'ギニア・ビザウ共和国', 11.86398, -15.59821],
	['ビシュケク', 'キルギス共和国', 42.870022, 74.587883],
	['平壌（ピョンヤン）', '北朝鮮', 39.031859, 125.753765],
	['ブエノスアイレス', 'アルゼンチン', -34.611781, -58.417309],
	['ブカレスト', 'ルーマニア', 44.430481, 26.12298],
	['釜山（プサン）', '韓国', 35.157871, 129.054703],
	['ブダペスト', 'ハンガリー', 47.490812, 19.08097],
	['プノンペン', 'カンボジア', 11.558831, 104.917445],
	['ブラザビル', 'コンゴ共和国', -4.280772, 15.28365],
	['プラハ', 'チェコ共和国', 50.078816, 14.437635],
	['プリマス', 'イングランド', 50.378535, -4.139914],
	['ブリュッセル', 'ベルギー', 50.837051, 4.367612],
	['ベオグラード', 'セルビア', 44.802416, 20.465601],
	['北京（ペキン）', '中国', 39.904491, 116.391468],
	['ヘルシンキ', 'フィンランド共和国', 60.160791, 24.952548],
	['ベルリン', 'ドイツ連邦共和国', 52.524268, 13.40629],
	['ホーチミン（旧名サイゴン）', 'ベトナム', 10.75918, 106.662498],
	['香港（ホンコン）', '中華人民共和国', 22.278381, 114.174287],
	['マドリード', 'スペイン', 40.422319, -3.704289],
	['マニラ', 'フィリピン', 14.600657, 120.98215],
	['マルセイユ', 'フランス', 43.291413, 5.375633],
	['ミュンヘン', 'ドイツ', 48.139743, 11.56005],
	['ミラノ', 'イタリア', 45.471156, 9.185727],
	['メキシコシティ', 'メキシコ', 19.410636, -99.130588],
	['メルボルン', 'オーストラリア', -37.809575, 144.965186],
	['モスクワ', 'ロシア連邦', 55.746455, 37.631895],
	['モナコ', 'モナコ公国', 43.73919, 7.427498],
	['モンテビデオ', 'ウルグアイ', -34.8939, -56.15684],
	['ヤンゴン', 'ミャンマー連邦', 16.783656, 96.156831],
	['ラパス', 'ボリビア', -16.49901, -68.146248],
	['リオデジャネイロ', 'ブラジル', -22.90937, -43.214998],
	['リスボン', 'ポルトガル', 38.727486, -9.148677],
	['リマ', 'ペルー共和国', -12.093084, -77.046491],
	['リヤド', 'サウジアラビア', 24.640151, 46.724893],
	['ルアンダ', 'アンゴラ共和国', -8.813513, 13.237476],
	['ローマ', 'イタリア', 41.899344, 12.49311],
	['ロサンゼルス', 'アメリカ合衆国', 34.05222, -118.24278],
	['ロンドン', 'イギリス', 51.508967, -0.126127],
	['ワシントン', 'アメリカ合衆国', 38.894561, -77.009571],
	['ワルシャワ', 'ポーランド', 52.244949, 21.011881],
	['ンジャメナ（ヌジャメナ）', 'チャド', 12.104797, 15.044506],
];

const app = new App();

App.loop(app);
