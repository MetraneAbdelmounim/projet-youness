import asyncio
from playwright.async_api import async_playwright
import time
import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymodbus.client import AsyncModbusTcpClient as ModbusClient
import aiohttp
import sys,os
if sys.version_info < (3, 9):
    from backports.zoneinfo import ZoneInfo
else:
    from zoneinfo import ZoneInfo
from datetime import datetime, timezone

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from mppt import mppt  # Assurez-vous que la classe mppt est définie dans mppt.py

app = Flask(__name__)
cors = CORS(app, resources={r"/mppt/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/mppt/<ip>', methods=['GET'])
async def getDataMppt(ip):
    try:
      
        c = ModbusClient(host=ip, port=502, unit_id=1, auto_open=True, timeout=5)
        await c.connect()
       
        rr = await c.read_holding_registers(0, 82, 1)

        if not rr or not hasattr(rr, "registers") or len(rr.registers) < 63:
            raise ValueError("Données Modbus invalides")

        mppt_data = mppt(
            rr.registers[24], rr.registers[28], rr.registers[27],
            rr.registers[16], rr.registers[19], rr.registers[62],
            rr.registers[20], rr.registers[22]
        )

        return jsonify({
            "success": True,
            "data": mppt_data.__dict__,
        })

    except Exception as e:
        mppt_data=mppt(0,0,0,0,0,0,0,0)
        return jsonify({"success": False, "message": str(e), "data": mppt_data.__dict__})





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
        elif sun_hours<2 and sun_hours>=1:
            return 35
    
    elif battery_type.lower() == "agm":
        if sun_hours >= 6:
            return 100
        elif sun_hours >= 3:
            return 65
        elif sun_hours<3 and sun_hours>=1:
            return 35
    return 0

# Récupération de la météo
from zoneinfo import ZoneInfo
from datetime import datetime

from zoneinfo import ZoneInfo
from datetime import datetime

async def get_weather_data(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=cloudcover&daily=sunshine_duration,sunset&hourly=cloudcover,temperature_2m&timezone=auto"

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            data = await resp.json()

            current_cloud = data["current"].get("cloudcover", 0)
            sunshine_duration = data["daily"]["sunshine_duration"][0] / 3600.0  # sec → hours

            sunset_time_str = data["daily"]["sunset"][0]
            timezone_str = data.get("timezone", "UTC")
            local_tz = ZoneInfo(timezone_str)

            now = datetime.now(local_tz)
            sunset_dt = datetime.fromisoformat(sunset_time_str).replace(tzinfo=local_tz)

            # --- Données horaires
            hourly_times = data["hourly"]["time"]
            hourly_clouds = data["hourly"]["cloudcover"]
            hourly_temps = data["hourly"]["temperature_2m"]

            remaining_clouds_today = []
            remaining_temps_today = []

            for time_str, cloud_value, temp_value in zip(hourly_times, hourly_clouds, hourly_temps):
                hour_dt = datetime.fromisoformat(time_str).replace(tzinfo=local_tz)

                if now.date() == hour_dt.date() and now <= hour_dt <= sunset_dt:
                    remaining_clouds_today.append(cloud_value)
                    remaining_temps_today.append(temp_value)

            # Moyennes
          
            avg_remaining_cloud = (
                sum(remaining_clouds_today) / len(remaining_clouds_today)
                if remaining_clouds_today else current_cloud
            )

            avg_remaining_temp = (
                sum(remaining_temps_today) / len(remaining_temps_today)
                if remaining_temps_today else 20.0  # fallback
            )

            remaining_sunlight = max(0, (sunset_dt - now).total_seconds() / 3600.0)

            return avg_remaining_temp, avg_remaining_cloud, sunshine_duration, remaining_sunlight



@app.route('/mppt/analysis/<ip>', methods=['GET']) 
async def getAnalysisMppt(ip):
    try:
        
        battery_type = request.args.get("battery_type", default="agm", type=str)
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)
        
        if lat is None or lon is None:
            lat = 45.58109
            lon = -73.48695
        c = ModbusClient(host=ip, port=502, unit_id=1, auto_open=True, timeout=5)
        await c.connect()
        rr = await c.read_holding_registers(0, 82, 1)

        if not rr or not hasattr(rr, "registers") or len(rr.registers) < 63:
            raise ValueError("Données Modbus invalides")

        mppt_data = mppt(
            rr.registers[24], rr.registers[28], rr.registers[27],
            rr.registers[16], rr.registers[19], rr.registers[62],
            rr.registers[20], rr.registers[22]
        )

        temperature, avg_remaining_cloud, total_sun_hours, remaining_sun_hours = await get_weather_data(lat, lon)
    
        temp_loss = battery_capacity_reduction(temperature)
        cloud_loss = solar_recharge_clouds(avg_remaining_cloud)
       
        adjusted_sun_hours = min(remaining_sun_hours, total_sun_hours)
        solar_eff = solar_recharge_duration(adjusted_sun_hours, battery_type)

        # Capacité finale estimée :
        initial_voltage = mppt_data.Battery_Voltage
        charge_percent = (solar_eff - cloud_loss) / 100
        capacity_loss_percent = temp_loss / 100
        performance_value = (1 + charge_percent) * (1 - capacity_loss_percent)

        performance = "DOWN"
        if performance_value < 0.75:
            performance = "DOWN"
        elif 0.75 <= performance_value <= 1.25:
            performance = "MEDIUM"
        else:
            performance = "UP"

        predicted_voltage = initial_voltage * performance_value
    
     
        analysis = {
            "temperature_ext": temperature,
            "avg_remaining_cloud": round(avg_remaining_cloud,2),
            "sun_hours": total_sun_hours,
            "remaining_sun_hours": round(remaining_sun_hours, 2),
            "battery_type": battery_type.lower(),
            "battery_capacity_loss": temp_loss,
            "solar_charge_loss_clouds": cloud_loss,
            "solar_charge_efficiency": solar_eff,
            "predicted_end_day_voltage": round(predicted_voltage, 2),
            "current_battery_voltage" : initial_voltage,
            "performance": performance
        }

        return jsonify({
            "success": True,
            "data": mppt_data.__dict__,
            "analysis": analysis
        })

    except Exception as e:
        mppt_data = mppt(0,0,0,0,0,0,0,0)
        return jsonify({"success": False, "message": str(e), "data": mppt_data.__dict__})
    
    

@app.route('/mppt/restart/<ip>', methods=['POST'])
def restart_endpoint(ip):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(run_playwright(ip))
    return result
async def run_playwright(ip):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            page.on("dialog", lambda dialog: asyncio.create_task(dialog.accept()))
            # Use your actual URL here:
            await page.goto(f"http://{ip}:4444/network.html")
        
            # Wait for JavaScript to initialize
            await page.wait_for_timeout(1000)

            # Trigger Save
            await page.evaluate("document.getElementsByName('BTNSave')[0]?.click()")
            await page.wait_for_timeout(1000)

            await browser.close()
            return jsonify({"status": "success", "message": "Save button clicked!"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True)
