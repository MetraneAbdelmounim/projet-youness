from mppt import mppt
import json
import time
from flask import Flask,jsonify
from flask_cors import CORS
app = Flask(__name__)
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

#from pymodbus.client import ModbusTcpClient as ModbusClient
from pymodbus.client import AsyncModbusTcpClient as ModbusClient
from pymodbus.constants import Endian
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.payload import BinaryPayloadBuilder


@app.route('/mppt/<ip>',methods=['GET'])
def getDataMppt(ip):
    Mppt = mppt(0,0,0,0,0,0,0,0)
    try :

        #c =ModbusClient(host=ip, port=502,unit_id=1, auto_open=True,timeout=10)
        #c.connect()
        #time.sleep(2)
        #rr = await c.read_holding_registers(0,82,2)
        #print(rr)
        #Mppt = mppt(rr.registers[24],rr.registers[28],rr.registers[27],rr.registers[16],rr.registers[19],rr.registers[62],rr.registers[20],rr.registers[22])
        Mppt=mppt(20065,20065,20065,20065,20065,20065,20065,20065)
        Mppt=mppt(20000,20065,20065,20065,20065,20065,20065,20065)
    except Exception as e:
        print(e)
        Mppt = mppt(0,0,0,0,0,0,0,0)

    return json.dumps(Mppt.__dict__)
