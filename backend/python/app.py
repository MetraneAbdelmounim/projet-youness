from mppt import mppt
import json
from flask import Flask,jsonify
from flask_cors import CORS
app = Flask(__name__)
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'
from pymodbus.client import ModbusTcpClient as ModbusClient
from pymodbus.constants import Endian
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.payload import BinaryPayloadBuilder


@app.route('/mppt/<ip>',methods=['GET'])
def getDataMppt(ip):
    #c = ModbusClient(host=ip, port=502,strict=False)
    #c.connect()
    #registers = c.read_holding_registers(0,82,1)

    #Mppt = mppt(registers[24],registers[28],registers[16])
    Mppt = mppt(20065 ,15374,15783)
    print(ip)
    return json.dumps(Mppt.__dict__)
