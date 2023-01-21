from mppt import mppt
import numpy as np
import random
import json
import time
from flask import Flask,jsonify
from flask_cors import CORS
app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

import asyncio
from async_modbus import AsyncTCPClient

@app.route('/mppt/<ip>',methods=['GET'])
async def getDataMppt(ip):
    Mppt = mppt(0,0,0,0,0,0,0,0)
    try :
        fut =asyncio.open_connection(ip, 502)
        reader, writer = await asyncio.wait_for(fut, timeout=2)
        client = AsyncTCPClient((reader, writer))
        read = await client.read_holding_registers(slave_id=1, starting_address=0, quantity=82)
        rr = np.array(read).tolist()
        Mppt = mppt(rr[24],rr[28],rr[27],rr[16],rr[19],rr[62],rr[20],rr[22])
        writer.close()
        await writer.wait_closed()

        #Mppt=mppt(random.randint(20000,20065),20065,20065,20065,20065,20065,20065,20065)
    except Exception as e:
        print(e)
        Mppt = mppt(0,0,0,0,0,0,0,0)

    return json.dumps(Mppt.__dict__)

    
