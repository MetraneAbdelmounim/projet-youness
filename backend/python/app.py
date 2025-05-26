import asyncio
import time
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymodbus.client import AsyncModbusTcpClient as ModbusClient
import aiohttp
import sys
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from mppt import mppt  # Assurez-vous que la classe mppt est définie dans mppt.py

app = Flask(__name__)
cors = CORS(app, resources={r"/mppt/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

# Analyse de la température sur la capacité de la batterie
def battery_capacity_reduction(temp):
    if temp <= -15:
        return 50
    elif temp <= -10:
        return 30
    elif temp <= -5:
        return 25
    elif temp <= 0:
        return 20
    return 0

# Analyse de la couverture nuageuse sur la capacité de recharge
def solar_recharge_clouds(cloud_cover):
    if cloud_cover >= 80:
        return 65
    elif cloud_cover >= 40:
        return 35
    return 0

# Analyse de la durée d’ensoleillement sur la recharge en fonction du type de batterie
def solar_recharge_duration(sun_hours, battery_type="lithium"):
    if battery_type.lower() == "lithium":
        if sun_hours >= 4:
            return 100
        elif sun_hours >= 2:
            return 65
        else:
            return 35
    elif battery_type.lower() == "agm":
        if sun_hours >= 6:
            return 100
        elif sun_hours >= 3:
            return 65
        else:
            return 35
    return 0

# Récupération de la météo
async def get_weather_data(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,cloudcover&daily=sunshine_duration&timezone=auto"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            data = await resp.json()
            temperature = data["current"]["temperature_2m"]
            cloud_cover = data["current"].get("cloudcover", 0)
            sunshine_duration = data["daily"]["sunshine_duration"][0] / 3600.0  # convert minutes to hours
            return temperature, cloud_cover, sunshine_duration

@app.route('/mppt/<ip>', methods=['GET'])
async def getDataMppt(ip):
    try:
        #lat = request.args.get("lat", type=float)
        #lon = request.args.get("lon", type=float)
        lat=46.839438
        lon=-71.243762
        battery_type = request.args.get("battery", default="agm", type=str)

        if lat is None or lon is None:
            return jsonify({"success": False, "message": "Latitude et longitude sont requises"}), 400

        c = ModbusClient(host=ip, port=502, unit_id=1, auto_open=True, timeout=5)
        await c.connect()
        await asyncio.sleep(2)
        rr = await c.read_holding_registers(0, 82, 1)

        if not rr or not hasattr(rr, "registers") or len(rr.registers) < 63:
            raise ValueError("Données Modbus invalides")

        mppt_data = mppt(
            rr.registers[24], rr.registers[28], rr.registers[27],
            rr.registers[16], rr.registers[19], rr.registers[62],
            rr.registers[20], rr.registers[22]
        )

        temperature, cloud_cover, sun_hours = await get_weather_data(lat, lon)

        analysis = {
            "temperature_ext": temperature,
            "cloud_cover": cloud_cover,
            "sun_hours": sun_hours,
            "battery_type": battery_type.lower(),
            "battery_capacity_loss": battery_capacity_reduction(temperature),
            "solar_charge_loss_clouds": solar_recharge_clouds(cloud_cover),
            "solar_charge_efficiency": solar_recharge_duration(sun_hours, battery_type)
        }

        return jsonify({
            "success": True,
            "data": mppt_data.__dict__,
            "analysis": analysis
        })

    except Exception as e:
        mppt_data=mppt(0,0,0,0,0,0,0,0)
        return jsonify({"success": False, "message": str(e), "data": mppt_data.__dict__})

if __name__ == '__main__':
    app.run(debug=True)
