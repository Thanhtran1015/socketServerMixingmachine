const path = require('path')
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const colors = require('colors');
//Khai bao thu vien socketio 
const socketio = require('socket.io')
const io = socketio(server, { 'pingInterval': 10000, 'pingTimeout': 10000 });
//const io = socketio(server);
//const sql = require('mssql');
const esp8266_nsp = io.of('/esp8266')
const middleware = require('socketio-wildcard')()
esp8266_nsp.use(middleware);

var date0 = new Date();
var RPMCollection = [];
var CreatedTimeCollection = [];
var RPMQuantity = 30;
var tempMilli = date0.getTime();
var startTime = 0;

//var onAlarm = false;

//Khai bao thu vien Mongodb
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://10.4.0.57:27017";

// Database Name
const dbName = 'IoT';

// Create a new MongoClient
//const client = new MongoClient(url);
const client = new MongoClient(url, { useNewUrlParser: true });

//Khai bao ham ho tro
const common = require('./helpers/common');

//Khai bao ip
const ip = require('ip');

const port = process.env.PORT || 3484
const publicDirectoryPath = path.join(__dirname, '../public')

var connection = require('./helpers/connection');

var socketCount = 0;


app.use(express.static(publicDirectoryPath))
app.set("view engine", "ejs");
app.set("views", "./views");
function sendTime() {
    let time = common.getDateTime().toString();
    var json = {

        time: time
    }
    io.sockets.emit('atime', json);
}

function sendAlarmOn(timeOut) {

    var json = {
        status: "ON"
    }
    console.log(json);
    io.sockets.emit('alarm', json);

    setTimeout(() => {
        sendAlarmOff();
    }, timeOut * 1000);
   // onAlarm = true;

    collection5.updateOne({coreID: data.coreID},{onAlarm: true},function(err, res) {

    });
}
function sendAlarmOff() {
    var json = {
        status: "OFF"
    }
    console.log(json);
    io.sockets.emit('alarm', json);
  //  onAlarm = false;

    collection5.updateOne({coreID: data.coreID},{onAlarm: false},function(err, res) {

    });
}

io.on('connection', (socket) => {
    console.log("-----------------------------------------")
    socketCount++;
    let Time1 = common.getDateTime().toString();

    console.log(`esp8266 connected. ID: = ${socket.id}, Time: ${Time1}`.green)
    console.log(`Users online : ${socketCount}`.green);

    socket.emit('welcome', {
        message: 'Connected !!!!'
    });

    socket.on('nameESP', function (data) {
        console.log(data);
    });
    socket.on('message', function (data) {
        console.log(data);
    });
    socket.on('revatime', function (data) {
        console.log(colors.gray(data));
    });
    socket.on('atime', function (data) {
        sendTime();
        console.log(colors.gray(data));
    });
    // 
    // 
    // 
    //     

    var tempDate = "";
    var updatedSequence = 1;

    // var cycleTimeCollection = [];
    // var cycleTimeQuantity = 10;

    var timeStartAsSeconds = common.getTimeCustom2();
    var timeStartAsString = common.getTimeCustom();
    socket.on('JSON', function (data) {

        var date1 = new Date();
        var milliNow = date1.getTime();

        // var timeNowString1 = common.getTimeCustom();
        // var hourNow1 = date1.getHours();
        // var minuteNow1 = date1.getMinutes();
        // var secondNow1 = date1.getSeconds();

        console.log(colors.green(data));

        if (milliNow - tempMilli > 1000) { //bat dau may start

            var today = common.getDateCustom();
            startTime = milliNow;

            if (today == tempDate) {
                updatedSequence++;
            }
            else {
                updatedSequence = 1;
            }
        }

        tempDate = today;
        tempMilli = milliNow;
        data.S = updatedSequence;
        data.C = common.getTimeCustom();

        if (data.D == 1) {
            timeStartAsSeconds = common.getTimeCustom2();
            timeStartAsString = common.getTimeCustom();
        }
        data.Start = timeStartAsString;

        var timeEndAsSeconds = timeStartAsSeconds + data.D;
        var hourEnd = Math.floor(timeEndAsSeconds / 3600);
        var timeEndAsSeconds2 = timeEndAsSeconds % 3600;
        var minuteEnd = Math.floor(timeEndAsSeconds2 / 60);
        var secondEnd = timeEndAsSeconds2 % 60;

        var hourEndAsString;
        var minuteEndAsString;
        var secondEndAsString;

        if (hourEnd < 10) {
            hourEndAsString = "0" + String(hourEnd);
        }
        else {
            hourEndAsString = String(hourEnd);
        }

        if (minuteEnd < 10) {
            minuteEndAsString = "0" + String(minuteEnd);
        }
        else {
            minuteEndAsString = String(minuteEnd);
        }
        if (secondEnd < 10) {
            secondEndAsString = "0" + String(secondEnd);
        }
        else {
            secondEndAsString = String(secondEnd);
        }
        var timeEndAsString = hourEndAsString + ":" + minuteEndAsString + ":" + secondEndAsString;

        data.End = timeEndAsString;

        // Use connect method to connect to the Server
        client.connect(function (err) {



            console.log("Connected successfully to server");

            const db = client.db(dbName);

            const collection3 = db.collection('RPM');
            const collection4 = db.collection('RPMDisplayData');
            const collection5 = db.collection('Settings');


            collection3.insertOne(data, function (err, result) {

                console.log("Inserted 1 document into the collection");

            });


            collection5.findOne({}, function (err, result) {
                if (err) throw err;

                // debugger;
                // if ( !(result.StandardRPM * 0.85 <= data.R <= result.StandardRPM * 1.15) && data.D >= result.StartAfter) {
                if (data.D >= result.StartAfter) {
                    if (result.StandardRPM > data.R) {
                        if (result.onAlarm == false) {
                            sendAlarmOn(result.TimeOut);
                        }
                    }

                }

            });

            // if (data.R > 0) {

            //if duration of cycle time <= 2, does not calculate!
            // if (data.d > 2000) {

            //get date today
            var today = common.getDateCustom();
            var timeNow = common.getTimeCustom();




            //db find one
            collection4.findOne({ 'CreatedDay': today }, function (err, result) {
                if (err) throw err;


                //if today's DisplayData not exist (if null), then insert new...
                //...document(ArduinoID: data.arduinoID,TotalTime: data.cycletime,Count:1,RealTime:data.cycletime,MinRealTime:data.cycletime,CreatedTime:datetime.now())
                if (result == null) {

                    //nếu ngày hôm nay chưa có dữ liệu, reset cycleTimeCollection, rồi thêm dữ liệu đầu tiên vào.
                    RPMCollection = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    RPMCollection[29] = data.R;
                    CreatedTimeCollection = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    CreatedTimeCollection[29] = data.C



                    //Gửi lên database với giá trị khởi tạo
                    collection4.insertOne({ 'CoreID': data.I, 'Duration': data.D, 'RPMCollection': RPMCollection, 'CreatedTimeCollection': CreatedTimeCollection, 'CreatedDay': today, 'FirstCreatedTime': timeNow, 'Sequence': updatedSequence, 'StartTime': timeStartAsString, 'EndTime': timeEndAsString }, function (err, result) {
                        console.log("Inserted 1 document into the collection");
                    });
                }


                //else update current document (not null)
                //nếu hôm nay có dữ liệu DisplayData rồi thì cập nhật mới
                else if (result != null) {



                    console.log(result);

                    //result.array[0].TotalTime += data.cycleTime
                    //if result.array[0].MinRealTime > data.cycleTime, then result.array[0].MinRealTime = data.cycleTime
                    //result.array[0].count++
                    //result.array[0].realTime = data.cycleTime

                    var newCoreID = data.I
                    var newDuration = data.D;

                    var newCreatedDay = result.CreatedDay;
                    var newFirstCreatedTime = result.FirstCreatedTime;

                    RPMCollection.push(data.R);

                    if (RPMCollection.length > RPMQuantity) {
                        RPMCollection.shift();
                    }

                    CreatedTimeCollection.push(data.C);

                    if (CreatedTimeCollection.length > RPMQuantity) {
                        CreatedTimeCollection.shift();
                    }

                    collection4.updateOne({ 'CreatedDay': today }, { $set: { 'CoreID': newCoreID, 'Duration': newDuration, 'RPMCollection': RPMCollection, 'CreatedTimeCollection': CreatedTimeCollection, 'CreatedDay': newCreatedDay, 'FirstCreatedTime': newFirstCreatedTime, 'Sequence': updatedSequence, 'StartTime': timeStartAsString, 'EndTime': timeEndAsString } }, function (err, res) {
                        if (err) throw err;
                        console.log("1 document updated");
                        //db.close();
                    });
                }
            });
            // }

            //}


        });


    });
    // socket.on('command', function (data) {
    //     //console.log(data);
    //     // let address = socket.handshake.address;
    //     // console.log('IP: ' + address);
    //     let Time3 = common.getDateTime().toString();
    //     var ct = Math.abs(Number(data.ct));
    //     console.log(Time3.red);
    //     if (data.ct != undefined && data.name != undefined) {
    //        //Nếu dữ liệu khác undefined 
    //         console.log('du lieu la'+ct)
    //         let Time = common.getDateTime().toString();
    //         //let value = ct;
    //         ///Thêm dữ liệu vào bảng CycleTime
    //         let a = data.name;
    //         let query = `INSERT INTO CycleTime(ArduinoID,RealTimeCycleTime,TimeRevCycleTime)VALUES ('${a}',${ct},'${Time}')`;
    //         common.insert(connection.config,query);
    //         //console.log(query.yellow);
    //         //retrieve displaydatas
    //         ///Kiểm tra bảng DisplayData theo data.name (là ArduinoID)
    //         let selectDisplayDatas = `SELECT * FROM DisplayDatas WHERE ArduinoID = '${data.name}' and CreateTime = '${common.getDateCustom()}'`;
    //         let item = common.GetItem(connection.config,selectDisplayDatas);
    //         item.then(result => {
    //             console.table(result);

    //             ///Nếu ArduinoID chưa có trong DisplayData
    //             if (result.rowsAffected[0]=== 0) {
    //                 console.log("chua co du lieu trong display data".cyan);
    //                 let query = `INSERT INTO DisplayDatas(ArduinoID,TotalTime,Count,RealTime,MinRealTime,CreateTime,CurrentTime)VALUES ('${data.name}',${ct},${1},${1}, ${1000000000000000},'${common.getDateCustom()}','${common.getDateTime()}')`
    //                 common.insert(connection.config,query);
    //                 console.log(query);
    //             }
    //             else {
    //                 ///Thì thêm mới
    //                 console.log("lay du lieu tu displaydata roi update lai".cyan);
    //                 // let select = `SELECT * FROM DisplayDatas WHERE ArduinoID = '${data.name}' and CreateTime = '${common.getDateCustom()}'`;
    //                 // var result2 =common.GetItem(select);
    //                // console.log(result[0]);
    //                  //update data

    //                   ///Tính totalTime để cập nhật
    //                  let totalTime = result.recordset[0].TotalTime +ct;
    //                  console.log(result.recordset.length);
    //                  //Đếm số lượng record thêm vào db
    //                  let count = result.recordset[0].Count + 1;

    //                  ///Tính thời gian nhỏ nhất để cập nhật
    //                  let realTime = ct;
    //                  var min=result.recordset[0].MinRealTime;
    //                  if (min >= ct) {
    //                      min = ct;
    //                  }
    //                  ///Cập nhật lại
    //                  //save db
    //                  let query = `UPDATE DisplayDatas SET Count =${count}, TotalTime=${totalTime},RealTime=${realTime} ,MinRealTime=${min}, CurrentTime = '${common.getDateTime()}' WHERE ArduinoID = '${data.name}' AND CreateTime = '${common.getDateCustom()}' `;
    //                  console.log(query);
    //                  common.Update(connection.config,query);
    //                //------------
    //             }
    //         })
    //     }

    // });

    socket.on('disconnect', () => {
        console.log("-----------------------------------------")
        socketCount--;
        console.log(`Users online : ${socketCount}`.red);
        let Time2 = common.getDateTime().toString();
        console.log(`User "${socket.id}" disconnected! `.red)
        console.log(`Time: ${Time2}`.red)

    })

})
server.listen(port, (res) => {
    // let a = "M1BC002";
    // let selectDisplayDatas = `SELECT * FROM DisplayDatas WHERE ArduinoID = '${a}' and CreateTime = '${common.getDateCustom()}'`;
    // console.log(selectDisplayDatas);
    // let item = common.GetItem(selectDisplayDatas);

    // let selectDisplayDatas = `SELECT * FROM DisplayDatas WHERE ArduinoID = 'M1BC002' and CreateTime = '2019-06-24 00:00:00.000'`;
    // let item = common.GetItem(connection.config, selectDisplayDatas);
    // item.then(result => {
    //     console.table(result.recordset)
    // })
    console.log(`Server is up on address ${ip.address()}:${port}!`.cyan);
})

app.get("/", function (req, res) {
    res.render("home");
}
);
