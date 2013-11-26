require 'date'
require 'json'

availability = Hash.new({})

# http://aa.usno.navy.mil/faq/docs/daylight_time.php
dst = {
    2006 => Date.new(2006,4,2)..Date.new(2006,10,28),
    2007 => Date.new(2007,3,11)..Date.new(2007,11,3),
    2008 => Date.new(2008,3,9)..Date.new(2008,11,1),
    2009 => Date.new(2009,3,8)..Date.new(2009,10,31),
    2010 => Date.new(2010,3,14)..Date.new(2010,11,6),
    2011 => Date.new(2011,3,13)..Date.new(2011,11,5),
    2012 => Date.new(2012,3,11)..Date.new(2012,11,3),
    2013 => Date.new(2013,3,10)..Date.new(2013,11,2),
    2014 => Date.new(2014,3,9)..Date.new(2014,11,1),
    2015 => Date.new(2015,3,8)..Date.new(2015,10,31),
    2016 => Date.new(2016,3,13)..Date.new(2016,11,5),
    2017 => Date.new(2017,3,12)..Date.new(2017,11,4),
    2018 => Date.new(2018,3,11)..Date.new(2018,11,3),
    2019 => Date.new(2019,3,10)..Date.new(2019,11,2),
    2020 => Date.new(2020,3,8)..Date.new(2020,10,31)
}

File.open('washingtondc.csv').each do |line|
    tfl_id, bikes, spaces, ts = line.split(",")
    dt = DateTime.parse(ts)
    dt = dst[dt.year].cover?(dt) ? dt.new_offset(-4.0/24) : dt.new_offset(-5.0/24)
    dt = Time.at((dt.to_time.to_i / 300.0).floor * 300).to_datetime
    # weekend = dt.wday == 6 || dt.wday == 0
    unless availability.has_key?(tfl_id)
        availability[tfl_id] = {}
    end
    unless availability[tfl_id].has_key?(dt.strftime("%H:%M"))
        availability[tfl_id][dt.strftime("%H:%M")] = {"obs" => 0, "av_count" => 0}
    end
    availability[tfl_id][dt.strftime("%H:%M")]["obs"] += 1
    availability[tfl_id][dt.strftime("%H:%M")]["av_count"] += bikes.to_i > 0 ? 1 : 0
end

availability.each do |tfl_id, times|
    times.each do |time, counts|
        availability[tfl_id][time] = (1.0 * counts["av_count"] / counts["obs"]).round(2)
    end
end

File.open("availability.json","w") { |f| f.write(availability.to_json) }